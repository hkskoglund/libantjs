'use strict';

const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const USBDevice = require('../usb/USBDevice');
const CumulativeOperatingTime0x52 = require('../legacy/cumulativeOperatingTime0x52');
const SPDCADSharedPage = require('../legacy/bike_spdcad/SPDCADShared');
const Message = require('../messages/Message');
const AcknowledgedDataMessage = require('../messages/data/AcknowledgedDataMessage');
const BroadcastDataMessage = require('../messages/data/BroadcastDataMessage');
const ResetSystemMessage = require('../messages/control/ResetSystemMessage');
const OpenRxScanModeMessage = require('../messages/control/OpenRxScanModeMessage');
const ConfigureEventBufferMessage = require('../messages/configuration/ConfigureEventBufferMessage');
const UnAssignChannelMessage = require('../messages/configuration/UnAssignChannelMessage');
const SetChannelRFFreqMessage = require('../messages/configuration/SetChannelRFFreqMessage');
const VersionMessage = require('../messages/requestedResponse/VersionMessage');
const CapabilitiesMessage = require('../messages/requestedResponse/CapabilitiesMessage');
const AdvancedBurstCurrentConfigurationMessage = require('../messages/requestedResponse/AdvancedBurstCurrentConfigurationMessage');
const ChannelIdMessage = require('../messages/requestedResponse/ChannelIdMessage');
const ChannelId = require('../channel/channelId');
const Directory = require('../profiles/antfs/lib/file/directory');
const File = require('../profiles/antfs/lib/file/file');
const FitFile = require('../profiles/antfs/lib/file/fitFile');
const DownloadRequest = require('../profiles/antfs/lib/request-response/downloadRequest');
const TransportManager = require('../profiles/antfs/lib/layer/transportManager');
const CRC = require('../profiles/antfs/lib/layer/util/crc');

function loadAmdModule(modulePath, dependencies, globals = {}) {
  let exported;

  vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), {
    define: (_dependencies, factory) => {
      exported = factory(..._dependencies.map(dependency => dependencies[dependency]));
    },
    ...globals
  }, { filename: modulePath });

  return exported;
}

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

function messageFrame(id, content) {
  const message = new Message(undefined, id);

  message.setContent(content);

  return message.serialize();
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

test('TransportManager rejects malformed and oversized download responses before allocation', () => {
  const malformedPayload = downloadResponse(0, 1, new Uint8Array(0));
  new DataView(malformedPayload.buffer).setUint32(4, 1, true);

  [
    downloadResponse(0, 0xFFFFFFFF, new Uint8Array(0)),
    malformedPayload,
    downloadResponse(1, 1, Uint8Array.from([1]))
  ].forEach(responseData => {
    const manager = Object.create(TransportManager.prototype);
    let downloadError;

    manager.host = new EventEmitter();
    manager.host.once('download', error => { downloadError = error; });
    manager.session = {
      index: 1,
      request: [new DownloadRequest(1)],
      response: []
    };
    manager.task = [{ done: false }];
    manager.execTaskIndex = 0;

    manager.onDownloadResponse(responseData);

    assert.ok(downloadError instanceof Error);
    assert.equal(manager.task[0].done, true);
    assert.equal(manager.session.packets, undefined);
  });
});

test('Directory.decode rejects incomplete headers and malformed file records', () => {
  const host = { log: { logging: false, log() {} } };
  const directory = new Directory(undefined, host);

  assert.throws(() => directory.decode(new Uint8Array(15)), /shorter than its header/);

  const zeroRecordLength = new Uint8Array(Directory.prototype.HEADER_LENGTH);
  assert.throws(() => directory.decode(zeroRecordLength), /Invalid directory structure length/);

  const incompleteRecord = new Uint8Array(Directory.prototype.HEADER_LENGTH + 1);
  incompleteRecord[1] = 16;
  assert.throws(() => directory.decode(incompleteRecord), /incomplete file record/);
});

test('Generic files have unique names and downloads persist without throwing', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'libantjs-'));
  const manager = Object.create(TransportManager.prototype);
  const directory = { timeFormat: File.prototype.TIME_FORMAT.COUNTER };
  const metadata = new Uint8Array(16);
  const packets = Uint8Array.from([0xAA, 0xBB]);
  const view = new DataView(metadata.buffer);
  let file;
  let filePath,
      waitForFile;

  view.setUint16(0, 3, true);
  metadata[2] = 1;
  view.setUint32(3, 0x12345600, true);
  view.setUint32(8, 2, true);
  file = new File(metadata, directory);
  filePath = path.join(dataDir, '1234', file.getFileName());

  manager.host = {
    option: { dataDir },
    authenticationManager: { clientSerialNumber: 1234 }
  };
  manager.log = { logging: false };

  try {
    assert.match(file.getFileName(), /^file-3-1-1193046\.bin$/);
    manager.onDownload(undefined, {
      index: file.index,
      file,
      packets
    });
    waitForFile = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Downloaded generic file was not written')), 1000);
      const checkFile = () => {
        if (fs.existsSync(filePath) && fs.statSync(filePath).size === packets.byteLength) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkFile, 10);
        }
      };
      checkFile();
    });
    await waitForFile;
    assert.deepEqual(fs.readFileSync(filePath), Buffer.from(packets));
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
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

test('ConfigureEventBufferMessage serializes and decodes all configuration bytes', () => {
  const message = new ConfigureEventBufferMessage(1, 10, 100);
  const serialized = message.serialize();
  const decoded = new ConfigureEventBufferMessage(messageFrame(0x74, Uint8Array.from([1, 10, 0, 100, 0])));

  assert.deepEqual(Array.from(serialized.subarray(3, -1)), [1, 10, 0, 100, 0]);
  assert.equal(decoded.config, 1);
  assert.equal(decoded.size, 10);
  assert.equal(decoded.time, 100);
});

test('UnAssignChannelMessage preserves the requested channel', () => {
  const message = new UnAssignChannelMessage(2);

  assert.deepEqual(Array.from(message.serialize().subarray(3, -1)), [2]);
});

test('VersionMessage decodes its null-terminated version from content', () => {
  const message = new VersionMessage(messageFrame(0x3e, Uint8Array.from([65, 78, 84, 43, 32, 49, 46, 0])));

  assert.equal(message.getVersion(), 'ANT+ 1.');
});

test('OpenRxScanModeMessage serializes the requested channel', () => {
  const message = new OpenRxScanModeMessage(3);

  assert.deepEqual(Array.from(message.serialize().subarray(3, -1)), [3]);
});

test('CapabilitiesMessage stringifies decoded capability fields', () => {
  const message = new CapabilitiesMessage(messageFrame(
    0x54,
    Uint8Array.from([8, 2, 1, 2, 4, 3, 2, 1])
  ));
  const output = message.toString();

  assert.match(output, /Channels 8 \| Networks 2/);
  assert.match(output, /\+No receive channels/);
  assert.match(output, /\+Network/);
  assert.match(output, /\+Event buffering/);
});

test('SetChannelRFFreqMessage preserves zero offsets and defaults omitted offsets', () => {
  const zeroOffset = new SetChannelRFFreqMessage(2, 0);
  const defaultOffset = new SetChannelRFFreqMessage(2);

  assert.deepEqual(Array.from(zeroOffset.serialize().subarray(3, -1)), [2, 0]);
  assert.deepEqual(Array.from(defaultOffset.serialize().subarray(3, -1)), [2, 66]);
});

test('AdvancedBurstCurrentConfigurationMessage decodes stall counts containing zero bytes', () => {
  const message = new AdvancedBurstCurrentConfigurationMessage(messageFrame(
    0x78,
    Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 1, 0, 0])
  ));

  assert.equal(message.stallCount, 1);
  assert.equal(message.retryCount, 0);
});

test('ChannelIdMessage exposes its decoded ChannelId', () => {
  const message = new ChannelIdMessage(messageFrame(
    0x51,
    Uint8Array.from([2, 0x34, 0x12, 0x56, 0x78])
  ));

  assert.equal(message.getId(), message.channelId);
  assert.equal(message.getId().deviceNumber, 0x1234);
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

test('USBChrome reopens the selected manifest device using its USB identifiers', () => {
  let findDevicesOptions;
  const USBChrome = loadAmdModule(
    path.join(__dirname, '..', 'usb', 'USBChrome.js'),
    { 'usb/USBDevice': USBDevice },
    { chrome: { usb: { findDevices: (options) => { findDevicesOptions = options; } } } }
  );
  const usb = new USBChrome({ deviceId: 'selected-device' });

  usb.enumeratedManifestDevices = [{
    id: 'selected-device',
    device: { vendorId: 0x0fcf, productId: 0x1008 }
  }];
  usb._onDeviceFound = () => {};

  usb._onEnumerationComplete();

  assert.equal(findDevicesOptions.vendorId, 0x0fcf);
  assert.equal(findDevicesOptions.productId, 0x1008);
});

test('USBWindows emits the defined enumeration-complete event', () => {
  const listeners = {};
  const watcher = {
    addEventListener: (name, listener) => { listeners[name] = listener; },
    start() {}
  };
  const windows = {
    Devices: {
      Usb: {
        UsbDeviceClass: function() {},
        UsbDevice: { getDeviceClassSelector: () => 'selector' }
      },
      Enumeration: {
        DeviceInformation: { createWatcher: () => watcher }
      }
    }
  };
  const USBWindows = loadAmdModule(
    path.join(__dirname, '..', 'usb', 'USBWindows.js'),
    { 'usb/USBDevice': USBDevice },
    { Windows: windows }
  );
  const usb = new USBWindows({});
  let emittedDevices;

  usb.on(USBDevice.prototype.EVENT.ENUMERATION_COMPLETE, devices => { emittedDevices = devices; });
  usb.init(() => {});
  listeners.enumerationcompleted();

  assert.equal(emittedDevices, usb.devices);
});

test('USBWindows resumes reading after an empty transfer', async () => {
  const USBWindows = loadAmdModule(
    path.join(__dirname, '..', 'usb', 'USBWindows.js'),
    { 'usb/USBDevice': USBDevice }
  );
  const usb = new USBWindows({ length: { in: 8 } });
  let readCalls = 0;

  usb.ANTdevice = { defaultInterface: { bulkInPipes: [{ endpointDescriptor: { maxPacketSize: 8 } }] } };
  usb.dataReader = {
    loadAsync: () => {
      readCalls++;
      return readCalls === 1 ? Promise.resolve(0) : new Promise(() => {});
    }
  };

  usb.listen();
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(readCalls, 2);
});

test('USBWindows emits only the original non-terminal read error', async () => {
  const USBWindows = loadAmdModule(
    path.join(__dirname, '..', 'usb', 'USBWindows.js'),
    { 'usb/USBDevice': USBDevice }
  );
  const usb = new USBWindows({ length: { in: 8 } });
  const readError = new Error('read failed');
  const emittedErrors = [];
  let readCalls = 0;

  usb.ANTdevice = { defaultInterface: { bulkInPipes: [{ endpointDescriptor: { maxPacketSize: 8 } }] } };
  usb.dataReader = {
    loadAsync: () => {
      readCalls++;
      return readCalls === 1 ? Promise.reject(readError) : new Promise(() => {});
    }
  };
  usb.on(USBDevice.prototype.EVENT.ERROR, error => emittedErrors.push(error));

  usb.listen();
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(emittedErrors, [readError]);
});

test('USBWindows does not retry a transfer after writeBytes fails', () => {
  const USBWindows = loadAmdModule(
    path.join(__dirname, '..', 'usb', 'USBWindows.js'),
    { 'usb/USBDevice': USBDevice }
  );
  const usb = new USBWindows({});
  const writeError = new Error('write failed');
  let storeCalls = 0;
  const callbackErrors = [];

  usb.ANTdevice = {};
  usb.dataWriter = {
    writeBytes: () => { throw writeError; },
    storeAsync: () => { storeCalls++; return Promise.resolve(); }
  };

  usb.transfer(new Uint8Array([1]), error => callbackErrors.push(error));

  assert.deepEqual(callbackErrors, [writeError]);
  assert.equal(storeCalls, 0);
});

test('CumulativeOperatingTime0x52 decodes battery status from byte 7', () => {
  const data = new Uint8Array(8);
  data[6] = 128;
  data[7] = 0x20;

  const page = new CumulativeOperatingTime0x52(
    { logger: { logging: false } },
    { data },
    undefined,
    0x52
  );

  assert.equal(page.descriptive.batteryStatus.batteryStatus, 2);
  assert.equal(page.descriptive.batteryStatus.toString(), 'Good');
});

test('SPDCADSharedPage calculates valid speed and cadence across 16-bit rollovers', () => {
  const previousPage = {
    bikeSpeedEventTime: 65000,
    cumulativeSpeedRevolutionCount: 65535,
    bikeCadenceEventTime: 65000,
    cumulativeCadenceRevolutionCount: 65535
  };
  const page = Object.create(SPDCADSharedPage.prototype);

  page.profile = { getPreviousPageValidateRolloverTime: () => previousPage };
  page.bikeSpeedEventTime = 488;
  page.cumulativeSpeedRevolutionCount = 0;
  page.bikeCadenceEventTime = 488;
  page.cumulativeCadenceRevolutionCount = 0;

  page.calcSpeed();
  page.calcCadence();

  assert.equal(page.relativeCumulativeSpeedRevolutionCount, 1);
  assert.equal(page.unCalibratedSpeed, 1);
  assert.equal(page.cadence, 60);
});
