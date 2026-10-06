'use strict';

const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Message = require('../messages/Message');
const AcknowledgedDataMessage = require('../messages/data/AcknowledgedDataMessage');
const BroadcastDataMessage = require('../messages/data/BroadcastDataMessage');
const ResetSystemMessage = require('../messages/control/ResetSystemMessage');
const ChannelId = require('../channel/channelId');
const Directory = require('../profiles/antfs/lib/file/directory');
const FitFile = require('../profiles/antfs/lib/file/fitFile');
const DownloadRequest = require('../profiles/antfs/lib/request-response/downloadRequest');
const TransportManager = require('../profiles/antfs/lib/layer/transportManager');
const CRC = require('../profiles/antfs/lib/layer/util/crc');

function downloadResponse(offset, fileSize, packets) {
  const data = new Uint8Array(16 + packets.length + 8);
  const view = new DataView(data.buffer);

  data[2] = 0;
  view.setUint32(4, packets.length, true);
  view.setUint32(8, offset, true);
  view.setUint32(12, fileSize, true);
  data.set(packets, 16);

  return data;
}

test('TransportManager continues a download with the CRC of the received prefix', () => {
  const manager = Object.create(TransportManager.prototype);
  const requests = [];
  const initialPackets = Uint8Array.from([1, 2, 3]);
  const managerCrc = new CRC();
  const expectedCrc = new CRC().calc16(initialPackets);

  manager.host = new EventEmitter();
  manager.log = { logging: false };
  manager.session = {
    index: 1,
    packets: new Uint8Array(6),
    request: [new DownloadRequest(1)],
    response: [],
    crcOffset: 0,
    crcSeed: 0
  };
  manager.task = [{ done: false }];
  manager.execTaskIndex = 0;
  manager.sendRequest = request => requests.push(request);

  manager.onDownloadResponse(downloadResponse(0, 6, initialPackets));

  assert.equal(requests.length, 1);
  assert.equal(requests[0].offset, initialPackets.length);
  assert.equal(requests[0].crcSeed, expectedCrc);
  assert.equal(manager.session.crcSeed, expectedCrc);
  assert.equal(manager.session.crcOffset, initialPackets.length);

  const finalPackets = Uint8Array.from([4, 5, 6]);
  manager.onDownloadResponse(downloadResponse(3, 6, finalPackets));

  assert.deepEqual(Array.from(manager.session.packets), [1, 2, 3, 4, 5, 6]);
  assert.equal(
    manager.session.crcSeed,
    managerCrc.updateCRC16(expectedCrc, finalPackets)
  );
  assert.equal(manager.session.crcOffset, 6);
});

test('TransportManager saves each downloaded directory as a readable listing', () => {
  const manager = Object.create(TransportManager.prototype);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'libantjs-'));
  const fileName = path.join(dataDir, '1234', 'directory-1234.txt');
  let listing = 'directory listing\n';
  const session = {
    index: 0,
    file: {
      getFileName: () => 'directory-1234',
      ls: () => listing
    }
  };

  manager.host = { option: { dataDir } };
  manager.host.authenticationManager = { clientSerialNumber: 1234 };
  manager.log = { logging: false };
  try {
    manager.onDownload(undefined, session);
    assert.equal(fs.readFileSync(fileName, 'utf8'), listing);

    listing = 'updated directory listing\n';
    manager.onDownload(undefined, session);
    assert.equal(fs.readFileSync(fileName, 'utf8'), listing);
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('ResetSystemMessage serializes to a valid reset frame', () => {
  const reset = new ResetSystemMessage();

  assert.deepEqual(Array.from(reset.serialize()), [0xa4, 0x01, 0x4a, 0x00, 0xef]);
});

test('Message.decode rejects incomplete frames and invalid CRCs', () => {
  const frame = new ResetSystemMessage().serialize();

  assert.throws(() => new Message(frame.subarray(0, frame.length - 1)), {
    message: 'Message is shorter than its declared length'
  });

  frame[frame.length - 1] ^= 0xff;
  assert.throws(() => new Message(frame), { message: 'Invalid message CRC' });
});

test('Message.serialize rejects content larger than the frame length field', () => {
  const message = new Message(undefined, 0x4e);
  message.setContent(new Uint8Array(256));

  assert.throws(() => message.serialize(), {
    name: 'RangeError',
    message: 'Message content must not exceed 255 bytes'
  });
});

test('Extended broadcast frames decode their channel ID', () => {
  const message = new Message(undefined, Message.prototype.BROADCAST_DATA);
  message.setContent(Uint8Array.from([
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x20, 0x34, 0x12, 0x56, 0x78
  ]));

  const decoded = new BroadcastDataMessage(message.serialize());

  assert.equal(decoded.channelId.deviceNumber, 0x1234);
  assert.equal(decoded.channelId.deviceType, 0x56);
  assert.equal(decoded.channelId.transmissionType, 0x78);
});

test('Extended acknowledged-data frames decode their channel ID', () => {
  const message = new Message(undefined, Message.prototype.ACKNOWLEDGED_DATA);
  message.setContent(Uint8Array.from([
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x20, 0x34, 0x12, 0x56, 0x78
  ]));

  const decoded = new AcknowledgedDataMessage(message.serialize());

  assert.equal(decoded.channelId.deviceNumber, 0x1234);
  assert.equal(decoded.channelId.deviceType, 0x56);
  assert.equal(decoded.channelId.transmissionType, 0x78);
});

test('ChannelId.decode rejects data shorter than four bytes even when the backing buffer is longer', () => {
  const data = Uint8Array.from([0x34, 0x12, 0x56, 0x78]);
  const channelId = new ChannelId();

  assert.throws(() => channelId.decode(data.subarray(0, 1)), {
    name: 'RangeError',
    message: 'Channel ID data must contain at least 4 bytes'
  });
});

test('ChannelId.decode respects the view offset and byte length', () => {
  const data = Uint8Array.from([0xff, 0xff, 0x34, 0x12, 0x56, 0x78, 0xff]);
  const channelId = new ChannelId();

  channelId.decode(data.subarray(2, 6));

  assert.equal(channelId.deviceNumber, 0x1234);
  assert.equal(channelId.deviceType, 0x56);
  assert.equal(channelId.transmissionType, 0x78);
});

test('ChannelId.decode clears a stale 20-bit device number', () => {
  const channelId = new ChannelId();

  channelId.decode(Uint8Array.from([1, 0, 0, 0x10]));
  assert.equal(channelId.deviceNumber20BIT, 0x10001);

  channelId.decode(Uint8Array.from([1, 0, 0, 0]));

  assert.equal(channelId.has20BitDeviceNumber(), 0);
  assert.equal(Object.hasOwn(channelId, 'deviceNumber20BIT'), false);
});

test('Directory.getFileName omits the authenticated client friendly name', () => {
  const host = {
    log: { log() {} },
    getClientFriendlyname: () => 'Forerunner 935',
    getClientSerialNumber: () => 3842729776
  };
  const directory = new Directory(undefined, host);

  assert.equal(directory.getFileName(), 'directory-3842729776');
});

test('Directory.getFileName falls back to the client serial number without a friendly name', () => {
  const host = {
    log: { log() {} },
    getClientFriendlyname: () => undefined,
    getClientSerialNumber: () => 3842729776
  };
  const directory = new Directory(undefined, host);

  assert.equal(directory.getFileName(), 'directory-3842729776');
});

test('Directory.ls starts the flags header on a new line', () => {
  const host = {
    log: { log() {} },
    getClientSerialNumber: () => 3842729776
  };
  const directory = new Directory(undefined, host);

  assert.ok(directory.ls().startsWith('\nFlags:'));
});

test('FitFile.getFileName omits the authenticated client friendly name', () => {
  const directory = {
    timeFormat: 0,
    host: {
      getClientFriendlyname: () => 'Forerunner 935',
      getClientSerialNumber: () => 3842729776
    }
  };
  const file = new FitFile(undefined, directory);
  file.subType = 2;
  file.index = 4;
  file.date = 0xFFFFFFFF;

  assert.equal(file.getFileName(), 'Settings.fit');
});

test('FitFile.getFileName prefixes only duplicate names in Unix format', () => {
  const directory = {
    file: [],
    timeFormat: 0,
    host: {
      getClientFriendlyname: () => 'Forerunner 935',
      getClientSerialNumber: () => 3842729776
    }
  };
  const schedule = new FitFile(undefined, directory);
  schedule.subType = 7;
  schedule.index = 24;
  schedule.date = 0xFFFFFFFF;
  directory.file.push(schedule);

  assert.equal(schedule.getFileName(true), 'Schedule.fit');

  const firstSportSettings = new FitFile(undefined, directory);
  firstSportSettings.subType = 3;
  firstSportSettings.index = 5;
  firstSportSettings.date = 0xFFFFFFFF;
  const secondSportSettings = new FitFile(undefined, directory);
  secondSportSettings.subType = 3;
  secondSportSettings.index = 6;
  secondSportSettings.date = 0xFFFFFFFF;
  directory.file.push(firstSportSettings, secondSportSettings);

  assert.equal(firstSportSettings.getFileName(true), '5-SportSettings.fit');
  assert.equal(secondSportSettings.getFileName(true), '6-SportSettings.fit');
  assert.equal(firstSportSettings.getFileName(), '5-SportSettings.fit');
  assert.equal(secondSportSettings.getFileName(), '6-SportSettings.fit');
});
