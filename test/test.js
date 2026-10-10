'use strict';
import assert from 'node:assert/strict';
import EventEmitter from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import CumulativeOperatingTime0x52 from '../profiles/antplus/cumulative-operating-time0x52.js';
import DeviceProfile from '../profiles/antplus/device-profile.js';
import ProductId0x51 from '../profiles/antplus/product-id0x51.js';
import DeviceProfile_BikeShared from '../profiles/antplus/bike-spdcad/device-profile-bike-shared.js';
import DeviceProfile_BikeCad from '../profiles/antplus/bike-cad/device-profile-bike-cad.js';
import DeviceProfile_BikeSpd from '../profiles/antplus/bike-spd/device-profile-bike-spd.js';
import DeviceProfile_SPDCAD from '../profiles/antplus/bike-spdcad/device-profile-spdcad.js';
import DeviceProfile_ENVIRONMENT from '../profiles/antplus/environment/device-profile-environment.js';
import SPDCADSharedPage from '../profiles/antplus/bike-spdcad/spdcad-shared.js';
import DeviceProfile_BikePower from '../profiles/antplus/bike-power/device-profile-bike-power.js';
import CalibrationMainPage from '../profiles/antplus/bike-power/calibration-main.js';
import BikePowerDataPage from '../profiles/antplus/bike-power/bike-power-data-page.js';
import PowerOnlyMainPage0x10 from '../profiles/antplus/bike-power/power-only-main-page0x10.js';
import TemperaturePage1 from '../profiles/antplus/environment/temperature-page1.js';
import DeviceProfile_HRM from '../profiles/antplus/hrm/device-profile-hrm.js';
import HRMPage0 from '../profiles/antplus/hrm/hrm-page0.js';
import HRMPage4 from '../profiles/antplus/hrm/hrm-page4.js';
import HRMPage5 from '../profiles/antplus/hrm/hrm-page5.js';
import HRMPage6 from '../profiles/antplus/hrm/hrm-page6.js';
import HRMPage9 from '../profiles/antplus/hrm/hrm-page9.js';
import DeviceProfile_SDM from '../profiles/antplus/sdm/device-profile-sdm.js';
import SDMPage1 from '../profiles/antplus/sdm/sdm-page1.js';
import SDMPage2 from '../profiles/antplus/sdm/sdm-page2.js';
import SDMPage3 from '../profiles/antplus/sdm/sdm-page3.js';
import Message from '../messages/message.js';
import AcknowledgedDataMessage from '../messages/data/acknowledged-data-message.js';
import BroadcastDataMessage from '../messages/data/broadcast-data-message.js';
import BurstDataMessage from '../messages/data/burst-data-message.js';
import AdvancedBurstDataMessage from '../messages/data/advanced-burst-data-message.js';
import ExtendedBroadcastDataMessage from '../messages/data/extended-broadcast-data-message.js';
import ExtendedAcknowledgedDataMessage from '../messages/data/extended-acknowledged-data-message.js';
import AddEncryptionIdMessage from '../messages/configuration/add-encryption-id-message.js';
import EnableChannelEncryptionMessage from '../messages/configuration/enable-channel-encryption-message.js';
import SetEncryptionKeyMessage from '../messages/configuration/set-encryption-key-message.js';
import SetEncryptionInfoMessage from '../messages/configuration/set-encryption-info-message.js';
import CryptoKeyNvmOpMessage from '../messages/configuration/crypto-key-nvm-op-message.js';
import EncryptionParametersMessage from '../messages/requested-response/encryption-parameters-message.js';
import ExtendedBurstDataMessage from '../messages/data/extended-burst-data-message.js';
import ChannelResponseMessage from '../messages/channel-response-event/channel-response-message.js';
import ResetSystemMessage from '../messages/control/reset-system-message.js';
import SleepMessage from '../messages/control/sleep-message.js';
import SetChannelSearchPriorityMessage from '../messages/configuration/set-channel-search-priority-message.js';
import AddChannelIdMessage from '../messages/configuration/add-channel-id-message.js';
import ConfigIdListMessage from '../messages/configuration/config-id-list-message.js';
import EnableExtRxMessagesMessage from '../messages/configuration/enable-ext-rx-messages-message.js';
import EnableLedMessage from '../messages/configuration/enable-led-message.js';
import EnableCrystalMessage from '../messages/configuration/enable-crystal-message.js';
import ConfigFrequencyAgilityMessage from '../messages/configuration/config-frequency-agility-message.js';
import Set128BitNetworkKeyMessage from '../messages/configuration/set-128-bit-network-key-message.js';
import ConfigHighDutySearchMessage from '../messages/configuration/config-high-duty-search-message.js';
import SetChannelSearchSharingMessage from '../messages/configuration/set-channel-search-sharing-message.js';
import SetUsbDescriptorStringMessage from '../messages/configuration/set-usb-descriptor-string-message.js';
import InitCwTestModeMessage from '../messages/test-mode/init-cw-test-mode-message.js';
import CwTestModeMessage from '../messages/test-mode/cw-test-mode-message.js';
import ConfigEventFilterMessage from '../messages/configuration/config-event-filter-message.js';
import ConfigSelectiveDataUpdateMessage from '../messages/configuration/config-selective-data-update-message.js';
import SetSduMaskMessage from '../messages/configuration/set-sdu-mask-message.js';
import EventFilterMessage from '../messages/requested-response/event-filter-message.js';
import SduMaskMessage from '../messages/requested-response/sdu-mask-message.js';
import OpenRxScanModeMessage from '../messages/control/open-rx-scan-mode-message.js';
import ConfigureEventBufferMessage from '../messages/configuration/configure-event-buffer-message.js';
import UnAssignChannelMessage from '../messages/configuration/un-assign-channel-message.js';
import SetChannelRFFreqMessage from '../messages/configuration/set-channel-rf-freq-message.js';
import VersionMessage from '../messages/requested-response/version-message.js';
import CapabilitiesMessage from '../messages/requested-response/capabilities-message.js';
import AdvancedBurstCurrentConfigurationMessage from '../messages/requested-response/advanced-burst-current-configuration-message.js';
import ChannelIdMessage from '../messages/requested-response/channel-id-message.js';
import ChannelId from '../channel/channel-id.js';
import Directory from '../profiles/antfs/lib/file/directory.js';
import File from '../profiles/antfs/lib/file/file.js';
import FitFile from '../profiles/antfs/lib/file/fit-file.js';
import ClientBeacon from '../profiles/antfs/lib/layer/client-beacon.js';
import DownloadRequest from '../profiles/antfs/lib/request-response/download-request.js';
import TransportManager from '../profiles/antfs/lib/layer/transport-manager.js';
import CRC from '../profiles/antfs/lib/layer/util/crc.js';

























































function downloadResponse(offset, fileSize, packets, crcSeed = 0) {
  const data = new Uint8Array(16 + packets.length + 8);
  const view = new DataView(data.buffer);
  const crc = new CRC();

  data[2] = 0;
  view.setUint32(4, packets.length, true);
  view.setUint32(8, offset, true);
  view.setUint32(12, fileSize, true);
  data.set(packets, 16);
  view.setUint16(data.length - 2, crc.updateCRC16(crcSeed, packets), true);

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
  manager.sendRequest = request => {
    requests.push(request);
    manager.session.request.push(request);
  };

  manager.onDownloadResponse(downloadResponse(0, 6, initialPackets));

  assert.equal(requests.length, 1);
  assert.equal(requests[0].offset, initialPackets.length);
  assert.equal(requests[0].crcSeed, expectedCrc);
  assert.equal(manager.session.crcSeed, expectedCrc);
  assert.equal(manager.session.crcOffset, initialPackets.length);

  const finalPackets = Uint8Array.from([4, 5, 6]);
  manager.onDownloadResponse(downloadResponse(3, 6, finalPackets, expectedCrc));

  assert.deepEqual(Array.from(manager.session.packets), [1, 2, 3, 4, 5, 6]);
  assert.equal(
    manager.session.crcSeed,
    managerCrc.updateCRC16(expectedCrc, finalPackets)
  );
  assert.equal(manager.session.crcOffset, 6);
});

test('TransportManager rejects download responses with an invalid data CRC', () => {
  const manager = Object.create(TransportManager.prototype);
  const response = downloadResponse(0, 1, Uint8Array.from([1]));
  let downloadError;

  response[response.length - 2] ^= 0xff;
  manager.host = new EventEmitter();
  manager.host.once('download', error => { downloadError = error; });
  manager.session = {
    index: 1,
    request: [new DownloadRequest(1)],
    response: [],
    crcOffset: 0,
    crcSeed: 0
  };
  manager.task = [{ done: false }];
  manager.execTaskIndex = 0;

  manager.onDownloadResponse(response);

  assert.match(downloadError.message, /CRC mismatch/);
  assert.equal(manager.task[0].done, true);
  assert.equal(manager.session.packets, undefined);
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

  const zeroRecordLength = new Uint8Array(Directory.HEADER_LENGTH);
  assert.throws(() => directory.decode(zeroRecordLength), /Invalid directory structure length/);

  const incompleteRecord = new Uint8Array(Directory.HEADER_LENGTH + 1);
  incompleteRecord[1] = 16;
  assert.throws(() => directory.decode(incompleteRecord), /incomplete file record/);
});

test('Directory resolves and erases files by their recorded indices', () => {
  const host = { log: { logging: false, log() {} } };
  const directory = new Directory(undefined, host);
  const data = new Uint8Array(Directory.HEADER_LENGTH + 2 * 16);
  const view = new DataView(data.buffer);

  data[1] = 16;
  view.setUint16(16, 2, true);
  view.setUint16(32, 5, true);
  directory.decode(data);

  assert.equal(directory.getFile(5).index, 5);
  assert.equal(directory.getFile(3), undefined);
  assert.equal(directory.eraseFile(5).index, 5);
  assert.deepEqual(directory.file.map(file => file.index), [2]);

  directory.decode(data);
  assert.deepEqual(directory.file.map(file => file.index), [2, 5]);
});

test('ClientBeacon recognizes the manufacturer ID MSB as the ANT+ Alliance flag', () => {
  const beacon = new ClientBeacon();
  const payload = Uint8Array.from([0x43, 0, 0, 0, 0, 0, 0x01, 0x80]);

  beacon.decode(payload);

  assert.equal(beacon.manufacturerID, 0x8001);
  assert.equal(beacon.deviceTypeManagedBy, 'ANT+ Alliance');
});

test('File decodes 24-bit identifiers as unsigned values', () => {
  const metadata = new Uint8Array(16);
  const directory = { timeFormat: File.TIME_FORMAT.COUNTER };

  new DataView(metadata.buffer).setUint32(3, 0xffffff00, true);

  assert.equal(new File(metadata, directory).identifier, 0xffffff);
});

test('Generic files have unique names and downloads persist without throwing', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'libantjs-'));
  const manager = Object.create(TransportManager.prototype);
  const directory = { timeFormat: File.TIME_FORMAT.COUNTER };
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

test('SleepMessage serializes the required zero filler byte', () => {
  assert.deepEqual(Array.from(new SleepMessage().serialize()), [0xa4, 0x01, 0xc5, 0x00, 0x60]);
});

test('Message.decode rejects incomplete frames and invalid CRCs', () => {
  const frame = new ResetSystemMessage().serialize();

  assert.throws(() => new Message(frame.subarray(0, frame.length - 1)), {
    message: 'Message is shorter than its declared length'
  });

  frame[frame.length - 1] ^= 0xff;
  assert.throws(() => new Message(frame), { message: 'Invalid message CRC' });
});

test('Message.decode rejects trailing bytes and subclass message ID mismatches', () => {
  const frame = new ResetSystemMessage().serialize();
  const frameWithTrailingData = new Uint8Array(frame.length + 1);

  frameWithTrailingData.set(frame);
  frameWithTrailingData[frame.length] = 0;

  assert.throws(() => new Message(frameWithTrailingData), {
    message: 'Message is longer than its declared length'
  });
  assert.throws(() => new BroadcastDataMessage(frame), {
    message: 'Unexpected message ID: expected 0x4e, received 0x4a'
  });
});

test('Message.serialize rejects content larger than the frame length field', () => {
  const message = new Message(undefined, 0x4e);
  message.setContent(new Uint8Array(256));

  assert.throws(() => message.serialize(), {
    name: 'RangeError',
    message: 'Message content must not exceed 255 bytes'
  });

  test('Standard data message encoders require exactly eight data bytes', () => {
    const message = new BroadcastDataMessage();

    assert.throws(() => message.encode(0, Uint8Array.from([1, 2, 3])), {
      name: 'RangeError',
      message: 'Standard ANT data payload must contain exactly 8 bytes'
    });
    assert.throws(() => message.encode(0, new Uint8Array(9)), {
      name: 'RangeError',
      message: 'Standard ANT data payload must contain exactly 8 bytes'
    });
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

test('OpenRxScanModeMessage serializes filler and optional sync-only flag', () => {
  assert.deepEqual(Array.from(new OpenRxScanModeMessage().serialize().subarray(3, -1)), [0]);
  assert.deepEqual(Array.from(new OpenRxScanModeMessage(true).serialize().subarray(3, -1)), [0, 1]);
});

test('SetChannelSearchPriorityMessage serializes channel and priority', () => {
  const message = new SetChannelSearchPriorityMessage(1, 2);

  assert.deepEqual(Array.from(message.serialize()), [0xa4, 0x02, 0x75, 1, 2, 0xa4 ^ 0x02 ^ 0x75 ^ 1 ^ 2]);
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

test('CapabilitiesMessage decodes standard option bits per spec 9.5.7.4', () => {
  const decode = standardOptions => new CapabilitiesMessage(messageFrame(
    0x54,
    Uint8Array.from([8, 8, standardOptions, 0, 0, 0, 0, 0])
  ));
  const flags = ['NO_RECEIVE_CHANNELS', 'NO_TRANSMIT_CHANNELS', 'NO_RECEIVE_MESSAGES',
    'NO_TRANSMIT_MESSAGES', 'NO_ACKD_MESSAGES', 'NO_BURST_MESSAGES'];

  flags.forEach((flag, bit) => {
    const message = decode(1 << bit);

    flags.forEach(other => assert.equal(Boolean(message[other]), other === flag, flag + ' bit ' + bit));
  });
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
  const message = new Message(undefined, Message.BROADCAST_DATA);
  message.setContent(Uint8Array.from([
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x80, 0x34, 0x12, 0x56, 0x78
  ]));

  const decoded = new BroadcastDataMessage(message.serialize());

  assert.equal(decoded.channelId.deviceNumber, 0x1234);
  assert.equal(decoded.channelId.deviceType, 0x56);
  assert.equal(decoded.channelId.transmissionType, 0x78);
});

test('Extended broadcast frames with truncated channel ID metadata do not throw', () => {
  const message = new Message(undefined, Message.BROADCAST_DATA);
  message.setContent(Uint8Array.from([
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x80, 0x34
  ]));

  const decoded = new BroadcastDataMessage(message.serialize());

  assert.equal(decoded.payload.length, 8);
  assert.equal(decoded.channelId, undefined);
  assert.equal(decoded.extendedDataError, 'Channel ID data must contain at least 4 bytes');
});

test('Extended acknowledged-data frames decode their channel ID', () => {
  const message = new Message(undefined, Message.ACKNOWLEDGED_DATA);
  message.setContent(Uint8Array.from([
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x80, 0x34, 0x12, 0x56, 0x78
  ]));

  const decoded = new AcknowledgedDataMessage(message.serialize());

  assert.equal(decoded.channelId.deviceNumber, 0x1234);
  assert.equal(decoded.channelId.deviceType, 0x56);
  assert.equal(decoded.channelId.transmissionType, 0x78);
});

test('Data message decoders reject short standard payloads and accept variable advanced burst payloads', () => {
  const shortBroadcast = messageFrame(Message.BROADCAST_DATA, Uint8Array.from([1, 2]));
  const shortBurst = messageFrame(Message.BURST_TRANSFER_DATA, Uint8Array.from([1, 2]));
  const shortChannelResponse = messageFrame(Message.CHANNEL_RESPONSE, Uint8Array.from([1, 2]));
  const advancedBurst = new AdvancedBurstDataMessage();

  assert.throws(() => new BroadcastDataMessage(shortBroadcast), {
    name: 'RangeError',
    message: 'Standard ANT data message must contain a channel and 8 data bytes'
  });
  assert.throws(() => new BurstDataMessage(shortBurst), {
    name: 'RangeError',
    message: 'Standard ANT burst message must contain a channel and 8 data bytes'
  });
  assert.throws(() => new ChannelResponseMessage(shortChannelResponse), {
    name: 'RangeError',
    message: 'Channel response message must contain at least 3 bytes'
  });

  test('ExtendedBurstDataMessage encodes and decodes channel ID, sequence, and data', () => {
    const source = new ExtendedBurstDataMessage();
    const channelId = { deviceNumber: 0x1234, deviceType: 0x56, transmissionType: 0x78 };
    const packet = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]);

    source.encode(0xA3, channelId, packet);
    const decoded = new ExtendedBurstDataMessage(source.serialize());

    assert.equal(decoded.channel, 3);
    assert.equal(decoded.sequenceNr, 5);
    assert.equal(decoded.channelId.deviceNumber, 0x1234);
    assert.equal(decoded.channelId.deviceType, 0x56);
    assert.equal(decoded.channelId.transmissionType, 0x78);
    assert.deepEqual(Array.from(decoded.packet), Array.from(packet));
    assert.throws(() => source.encode(0x100, channelId, packet), {
      name: 'RangeError',
      message: 'Extended ANT burst sequence/channel must be a byte'
    });
  });

  advancedBurst.encode(0, new Uint8Array(16));
  assert.equal(advancedBurst.content.byteLength, 17);
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

test('ProductId0x51 decodes supplemental and main software revisions per Common Data Pages', () => {
  const data = new Uint8Array([0x51, 0xFF, 100, 13, 0, 0, 0, 0]);
  const page = new ProductId0x51(
    { logger: { logging: false } },
    { data },
    undefined,
    0x51
  );

  assert.equal(page.SWRevisionString, '1.4');

  data[2] = 0xFF;
  data[3] = 5;
  const mainOnlyPage = new ProductId0x51(
    { logger: { logging: false } },
    { data },
    undefined,
    0x51
  );

  assert.equal(mainOnlyPage.SWRevisionString, '0.5');
});

test('CumulativeOperatingTime0x52 decodes battery identifiers and the unused time sentinel', () => {
  const data = new Uint8Array([0x52, 0xFF, 0x21, 0xFF, 0xFF, 0xFF, 0xFF, 0x20]);
  const page = new CumulativeOperatingTime0x52(
    { logger: { logging: false } },
    { data },
    undefined,
    0x52
  );

  assert.equal(page.batteryIdentifier, 2);
  assert.equal(page.numberOfBatteries, 1);
  assert.equal(page.cumulativeOperatingTime, undefined);
  assert.equal(page.lastBatteryReset, undefined);
  assert.match(page.toString(), /Cumulative operating time unavailable/);
  assert.doesNotMatch(page.toString(), /Battery reset ca\./);
});

test('SPDCADSharedPage calculates valid speed and cadence across 16-bit rollovers', () => {
  const previousPage = {
    bikeSpeedEventTime: 65000,
    cumulativeSpeedRevolutionCount: 65535,
    bikeCadenceEventTime: 65000,
    cumulativeCadenceRevolutionCount: 65535
  };
  const page = Object.create(SPDCADSharedPage.prototype);

  page.profile = {
    constructor: { WHEEL_CIRCUMFERENCE: 2.07 },
    getPreviousBikeMeasurementPageValidateRolloverTime: () => previousPage
  };
  page.bikeSpeedEventTime = 488;
  page.cumulativeSpeedRevolutionCount = 0;
  page.bikeCadenceEventTime = 488;
  page.cumulativeCadenceRevolutionCount = 0;

  page.calcSpeed();
  page.calcCadence();

  assert.equal(page.relativeCumulativeSpeedRevolutionCount, 1);
  assert.equal(page.unCalibratedSpeed, 1);
  assert.equal(page.speed, 2.07);
  assert.equal(page.cadence, 60);
});

test('SPDCADSharedPage applies configured wheel circumference to speed in m/s', () => {
  const previousPage = {
    bikeSpeedEventTime: 0,
    cumulativeSpeedRevolutionCount: 0
  };
  const page = Object.create(SPDCADSharedPage.prototype);

  page.profile = {
    constructor: { WHEEL_CIRCUMFERENCE: 2.1 },
    getPreviousBikeMeasurementPageValidateRolloverTime: () => previousPage
  };
  page.bikeSpeedEventTime = 1024;
  page.cumulativeSpeedRevolutionCount = 1;

  page.calcSpeed();

  assert.equal(page.unCalibratedSpeed, 1);
  assert.equal(page.speed, 2.1);
});

test('Bike speed/cadence profile accepts a validated wheel circumference setting', () => {
  const profile = new DeviceProfile_BikeShared({
    logger: { logging: false },
    wheelCircumference: 2.15
  });
  assert.equal(profile.constructor.WHEEL_CIRCUMFERENCE, 2.15);
  assert.equal(profile.timer.onPage, undefined);
  assert.throws(
    () => new DeviceProfile_BikeShared({ logger: { logging: false }, wheelCircumference: 0 }),
    /Wheel circumference must be a positive finite number/
  );
});

test('Bike profile setup runs once in concrete profile constructors', () => {
  const originalInit = DeviceProfile.prototype.initMasterSlaveConfiguration;
  const originalRequest = DeviceProfile.prototype.requestPageUpdate;
  let initCalls = 0;
  let requestCalls = 0;
  DeviceProfile.prototype.initMasterSlaveConfiguration = () => { initCalls++; };
  DeviceProfile.prototype.requestPageUpdate = () => { requestCalls++; };

  try {
    new DeviceProfile_BikeShared({ logger: { logging: false } });
    assert.equal(initCalls, 0);
    assert.equal(requestCalls, 0);

    new DeviceProfile_BikeCad({ logger: { logging: false } });
    new DeviceProfile_BikeSpd({ logger: { logging: false } });
    new DeviceProfile_SPDCAD({ logger: { logging: false } });
    assert.equal(initCalls, 3);
    assert.equal(requestCalls, 3);
  } finally {
    DeviceProfile.prototype.initMasterSlaveConfiguration = originalInit;
    DeviceProfile.prototype.requestPageUpdate = originalRequest;
  }
});

test('Bike calculations use measurement history and skip intervening background pages', () => {
  const profile = Object.create(DeviceProfile_BikeShared.prototype);
  profile.measurementPages = [];
  profile.receivedPage = [];
  profile.page = {};
  profile.log = { logging: false };

  const previousMeasurement = {
    bikeSpeedEventTime: 100,
    cumulativeSpeedRevolutionCount: 10,
    timestamp: 1000
  };
  const backgroundPage = { number: 0x50, timestamp: 1010 };
  const currentMeasurement = { timestamp: 1020 };

  profile.addPage(previousMeasurement);
  profile.addPage(backgroundPage);

  assert.equal(profile.receivedPage.length, 2);
  assert.equal(profile.measurementPages.length, 1);
  assert.equal(
    profile.getPreviousBikeMeasurementPageValidateRolloverTime(currentMeasurement),
    previousMeasurement
  );
  assert.equal(
    profile.getPreviousBikeMeasurementPageValidateRolloverTime({ timestamp: 65000 }),
    undefined
  );
});

test('Bike cadence profile processes pages 4 and 5 but not common-page measurements', () => {
  const profile = Object.create(DeviceProfile_BikeCad.prototype);
  profile.log = { logging: false };
  profile.getPreviousBikeMeasurementPageValidateRolloverTime = () => undefined;
  profile.getPageNumber = () => 4;
  profile.getBackgroundPage = () => { throw new Error('Page 4 should use bike event fields'); };

  const page4Data = new Uint8Array([0x04, 0xFF, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00]);
  const page4 = profile.getPage({ data: page4Data });
  assert.equal(page4.number, 4);
  assert.equal(page4.bikeCadenceEventTime, 1024);
  assert.equal(page4.cumulativeCadenceRevolutionCount, 1);

  profile.getPageNumber = () => 5;
  const page5Data = new Uint8Array([0x05, 0x01, 0xFF, 0xFF, 0x00, 0x04, 0x01, 0x00]);
  const page5 = profile.getPage({ data: page5Data });
  assert.equal(page5.stopIndicator, true);
  assert.equal(page5.cadence, 0);

  profile.getPageNumber = () => 0x50;
  const commonPage = { number: 0x50 };
  profile.getBackgroundPage = () => commonPage;
  assert.equal(profile.getPage({ data: new Uint8Array(8) }), commonPage);
  assert.equal(commonPage.cadence, undefined);
});

test('Bike speed profile processes pages 4 and 5 but not common-page measurements', () => {
  const profile = Object.create(DeviceProfile_BikeSpd.prototype);
  profile.log = { logging: false };
  profile.getPreviousBikeMeasurementPageValidateRolloverTime = () => undefined;
  profile.getPageNumber = () => 4;
  profile.getBackgroundPage = () => { throw new Error('Page 4 should use bike event fields'); };

  const page4Data = new Uint8Array([0x04, 0xFF, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00]);
  const page4 = profile.getPage({ data: page4Data });
  assert.equal(page4.number, 4);
  assert.equal(page4.bikeSpeedEventTime, 1024);
  assert.equal(page4.cumulativeSpeedRevolutionCount, 1);

  profile.getPageNumber = () => 5;
  const page5Data = new Uint8Array([0x05, 0x01, 0xFF, 0xFF, 0x00, 0x04, 0x01, 0x00]);
  const page5 = profile.getPage({ data: page5Data });
  assert.equal(page5.stopIndicator, true);
  assert.equal(page5.speed, 0);

  profile.getPageNumber = () => 0x50;
  const commonPage = { number: 0x50 };
  profile.getBackgroundPage = () => commonPage;
  assert.equal(profile.getPage({ data: new Uint8Array(8) }), commonPage);
  assert.equal(commonPage.speed, undefined);
});

test('TemperaturePage1 decodes negative signed temperatures and invalid values', () => {
  const configuration = { logger: { logging: false } };
  const makePage = data => new TemperaturePage1(
    configuration,
    { data: Uint8Array.from(data) },
    undefined,
    1
  );
  const negativeLow = makePage([1, 0xff, 0, 0xff, 0xf0, 0, 0, 0]);
  const negativeHigh = makePage([1, 0xff, 0, 0, 0x0f, 0xff, 0, 0]);
  const negativeCurrent = makePage([1, 0xff, 0, 0, 0, 0, 0xff, 0xff]);
  const invalid = makePage([1, 0xff, 0, 0, 0x80, 0x80, 0, 0x80]);

  assert.equal(negativeLow.hour24Low, -0.1);
  assert.equal(negativeHigh.hour24High, -0.1);
  assert.equal(negativeCurrent.currentTemp, -0.01);
  assert.equal(invalid.hour24Low, undefined);
  assert.equal(invalid.hour24High, undefined);
  assert.equal(invalid.currentTemp, undefined);
  assert.match(invalid.toString(), /Low \(24H\) N\/A°C High \(24H\) N\/A°C Current Temp N\/A°C/);
});

test('Environment profile configures the selected supported channel period', () => {
  const originalInit = DeviceProfile_ENVIRONMENT.prototype.initMasterSlaveConfiguration;
  const originalRequest = DeviceProfile_ENVIRONMENT.prototype.requestPageUpdate;
  let selectedPeriod;

  DeviceProfile_ENVIRONMENT.prototype.initMasterSlaveConfiguration = period => {
    selectedPeriod = period;
  };
  DeviceProfile_ENVIRONMENT.prototype.requestPageUpdate = () => {};

  try {
    new DeviceProfile_ENVIRONMENT({
      logger: { logging: false },
      channelPeriod: DeviceProfile_ENVIRONMENT.CHANNEL_PERIOD.ALTERNATIVE
    });
    assert.equal(selectedPeriod, 65535);
    assert.throws(
      () => new DeviceProfile_ENVIRONMENT({ logger: { logging: false }, channelPeriod: 1234 }),
      /Unsupported ANT\+ Environment channel period/
    );
  } finally {
    DeviceProfile_ENVIRONMENT.prototype.initMasterSlaveConfiguration = originalInit;
    DeviceProfile_ENVIRONMENT.prototype.requestPageUpdate = originalRequest;
  }
});

test('DeviceProfile applies the selected channel period to master and slave configurations', () => {
  const hadSetting = Object.hasOwn(global, 'setting');
  const originalSetting = global.setting;
  const configurations = {};
  const profile = {
    constructor: { name: 'Environment' },
    CHANNEL_ID: { DEVICE_TYPE: 0x19, TRANSMISSION_TYPE: 0x05 },
    CHANNEL_PERIOD: { DEFAULT: 8192 },
    addConfiguration: (name, configuration) => { configurations[name] = configuration; }
  };

  global.setting = {
    networkKey: { 'ANT+': [] },
    RFfrequency: { 'ANT+': 57 }
  };

  try {
    DeviceProfile.prototype.initMasterSlaveConfiguration.call(profile, 65535);
    assert.equal(configurations.slave.channelPeriod, 65535);
    assert.equal(configurations.master.channelPeriod, 65535);
  } finally {
    if (hadSetting) {
      global.setting = originalSetting;
    } else {
      delete global.setting;
    }
  }
});

test('Environment profile ignores reserved pages and routes only supported common pages', () => {
  const routedPages = [];
  const profile = {
    log: { logging: false },
    getPageNumber: DeviceProfile_ENVIRONMENT.prototype.getPageNumber,
    getBackgroundPage: (_broadcast, pageNumber) => {
      routedPages.push(pageNumber);
      return { number: pageNumber };
    }
  };
  const getPage = pageNumber => DeviceProfile_ENVIRONMENT.prototype.getPage.call(profile, {
    data: Uint8Array.from([pageNumber, 0xff, 0xff, 0, 0, 0, 0, 0])
  });

  assert.equal(getPage(2), undefined);
  assert.equal(getPage(3), undefined);
  assert.deepEqual(routedPages, []);
  assert.equal(getPage(0x50).number, 0x50);
  assert.equal(getPage(0x51).number, 0x51);
  assert.equal(getPage(0x52).number, 0x52);
  assert.deepEqual(routedPages, [0x50, 0x51, 0x52]);
});

test('HRM background pages are not decoded as heart-rate data', () => {
  const backgroundPage = {
    broadcast: { data: Uint8Array.from([0x50, 0, 0, 0, 1, 0, 1, 100]) }
  };
  const profile = {
    getPageNumber: () => 0x50,
    getBackgroundPage: () => backgroundPage
  };

  const page = DeviceProfile_HRM.prototype.getPage.call(
    profile,
    { data: backgroundPage.broadcast.data }
  );

  assert.equal(page, backgroundPage);
  assert.equal(page.computedHeartRate, undefined);
  assert.equal(page.RRInterval, undefined);
});

test('HRM page 4 calculates RR interval from its own previous beat timestamp', () => {
  const page = new HRMPage4(
    { logger: { logging: false } },
    { data: Uint8Array.from([4, 0, 0xe8, 0x03, 0xe8, 0x07, 2, 100]) },
    { receivedPage: [] },
    4
  );

  assert.equal(page.RRInterval, 1000);
});

test('HRM legacy page finds the previous heart-rate page past background pages', () => {
  const previousPage = { heartBeatCount: 10, heartBeatEventTime: 1024 };
  const page = new HRMPage0(
    { logger: { logging: false } },
    { data: Uint8Array.from([0, 0, 0, 0, 0, 8, 11, 100]) },
    { receivedPage: [previousPage, { number: 2 }] },
    0
  );

  assert.equal(page.RRInterval, 1000);
});

test('HRM page 4 accepts a previous beat timestamp of zero', () => {
  const page = new HRMPage4(
    { logger: { logging: false } },
    { data: Uint8Array.from([4, 0, 0, 0, 0, 4, 2, 100]) },
    { receivedPage: [] },
    4
  );

  assert.equal(page.RRInterval, 1000);
});

test('HRM dispatches and decodes pages 5, 6, and 9', () => {
  const profile = {
    log: { logging: false },
    isPageToggle: () => true,
    getPageNumber: DeviceProfile_HRM.prototype.getPageNumber
  };
  const getPage = pageData => DeviceProfile_HRM.prototype.getPage.call(profile, {
    data: Uint8Array.from(pageData)
  });
  const page5 = getPage([5, 72, 180, 80, 0, 0, 1, 72]);
  const page6 = getPage([6, 0xff, 0x0f, 0x05, 0xff, 0xff, 0xff, 0xff]);
  const page9 = getPage([9, 0x01, 0xff, 0xff, 0, 0, 0, 0]);

  assert.ok(page5 instanceof HRMPage5);
  assert.equal(page5.intervalAverageHeartRate, 72);
  assert.equal(page5.intervalMaximumHeartRate, 180);
  assert.equal(page5.sessionAverageHeartRate, 80);
  assert.equal(page5.computedHeartRate, 72);

  assert.ok(page6 instanceof HRMPage6);
  assert.equal(page6.supported.extendedRunning, true);
  assert.equal(page6.supported.gymMode, true);
  assert.equal(page6.enabled.extendedSwimming, true);
  assert.equal(page6.enabled.extendedRunning, true);

  assert.ok(page9 instanceof HRMPage9);
  assert.equal(page9.heartBeatEventType, HRMPage9.HEART_BEAT_EVENT_TYPE.COMPUTED);
});

test('SDM dispatches common background pages without calling a missing decode method', () => {
  let emittedPage;
  let requestedBackgroundPage;
  const profile = Object.create(DeviceProfile_SDM.prototype);
  profile.verifyDeviceType = () => true;
  profile.countBroadcast = () => {};
  profile.isDuplicateMessage = () => false;
  profile.getBackgroundPage = (_broadcast, pageNumber) => {
    requestedBackgroundPage = pageNumber;
    return { number: pageNumber, toString: () => 'background page' };
  };
  profile.receivedBroadcastCounter = { sensor: 4 };
  profile.log = { logging: false };
  profile.onPage = page => { emittedPage = page; };

  profile.broadCast({
    data: Uint8Array.from([0x50, 0, 0, 0, 0, 0, 0, 0]),
    channelId: { sensorId: 'sensor', deviceType: 0x7c }
  });

  assert.equal(requestedBackgroundPage, 0x50);
  assert.equal(emittedPage.number, 0x50);
});

test('SDM uses the specified master transmission type and decodes page 3 calories', () => {
  assert.equal(DeviceProfile_SDM.CHANNEL_ID.TRANSMISSION_TYPE, 0x05);

  let emittedPage;
  const profile = Object.create(DeviceProfile_SDM.prototype);
  profile.verifyDeviceType = () => true;
  profile.countBroadcast = () => {};
  profile.isDuplicateMessage = () => false;
  profile.SDMPage3 = new SDMPage3({ logger: { logging: false } });
  profile.receivedBroadcastCounter = { sensor: 4 };
  profile.log = { logging: false };
  profile.onPage = page => { emittedPage = page; };
  profile.broadCast({
    data: Uint8Array.from([3, 0xff, 0xff, 90, 0, 5, 42, 1]),
    channelId: { sensorId: 'sensor', deviceType: 0x7c }
  });

  assert.ok(emittedPage instanceof SDMPage3);
  assert.equal(emittedPage.calories, 42);
  assert.equal(emittedPage.cadence, 90);
});

test('SDM page 1 reconstructs time, distance, and stride counter rollovers per sensor', () => {
  const page = new SDMPage1({ logger: { logging: false } });
  const decode = (sensorId, data) => page.decode({
    data: Uint8Array.from(data),
    channelId: { sensorId }
  });

  decode('sensor-a', [1, 0, 255, 255, 0xf0, 0, 255, 0]);
  assert.equal(page.cumulativeTime, 0);
  assert.equal(page.cumulativeDistance, 0);
  assert.equal(page.cumulativeStrideCount, 0);

  decode('sensor-a', [1, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(page.cumulativeTime, 1);
  assert.equal(page.cumulativeDistance, 1 / 16);
  assert.equal(page.cumulativeStrideCount, 1);

  decode('sensor-b', [1, 0, 10, 20, 0, 0, 30, 0]);
  assert.equal(page.cumulativeTime, 0);
  assert.equal(page.cumulativeDistance, 0);
  assert.equal(page.cumulativeStrideCount, 0);
});

test('SDM page 2 initializes status before decoding a constructor broadcast', () => {
  const page = new SDMPage2(
    { logger: { logging: false } },
    { data: Uint8Array.from([2, 0xff, 0xff, 90, 0, 0, 0xff, 0x41]) }
  );

  assert.equal(page.status.SDMLocation, 1);
  assert.equal(page.status.UseState, 1);
});

test('Bike Power dispatches all defined profile data page families', () => {
  const profile = Object.create(DeviceProfile_BikePower.prototype);
  profile.log = { logging: false };
  profile.getPreviousPage = () => undefined;
  const decode = data => profile.getPage({ data: Uint8Array.from(data) });

  for (const pageNumber of [0x02, 0x03, 0x11, 0x12, 0x13, 0x20, 0xE0, 0xE1, 0xE2]) {
    assert.ok(decode([pageNumber, 1, 2, 60, 0, 8, 0, 32]) instanceof BikePowerDataPage,
      'page ' + pageNumber.toString(16));
  }

  const wheelTorque = decode([0x11, 1, 2, 60, 0, 8, 32, 0]);
  assert.equal(wheelTorque.accumulatedPeriodSeconds, 1);
  assert.equal(wheelTorque.accumulatedTorqueNm, 1);

  const crankTorqueFrequency = decode([0x20, 1, 0x01, 0xFF, 0x08, 0x00, 0x12, 0x34]);
  assert.equal(crankTorqueFrequency.slope, 51.1);
  assert.equal(crankTorqueFrequency.measurementTimestamp, 1.024);
  assert.equal(crankTorqueFrequency.torqueTicksStamp, 0x1234);
});

test('Bike Power treats invalid cadence values as unavailable', () => {
  const profile = { getPreviousPage: () => undefined };
  const page = new PowerOnlyMainPage0x10(
    { logger: { logging: false } },
    { data: Uint8Array.from([0x10, 0, 0xff, 0xff, 0, 0, 0, 0]) },
    profile,
    0x10
  );

  assert.equal(page.instantaneousCadence, undefined);
});

test('Bike Power manual-zero request sends the required acknowledged payload', () => {
  const profile = Object.create(DeviceProfile_BikePower.prototype);
  const sentResult = Promise.resolve();
  let sentPayload;

  assert.deepEqual(Array.from(profile.createManualZeroRequest()), [
    0x01, 0xAA, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF
  ]);
  const result = profile.requestManualZero((payload) => {
    sentPayload = payload;
    return sentResult;
  });

  assert.deepEqual(Array.from(sentPayload), Array.from(profile.createManualZeroRequest()));
  assert.equal(result, sentResult);
  assert.throws(() => profile.requestManualZero(undefined), /sendAcknowledged/);
});

test('Bike Power calibration page renders all defined calibration IDs safely', () => {
  const configuration = { logger: { logging: false } };
  const makePage = calibrationId => new CalibrationMainPage(configuration, {
    data: Uint8Array.from([0x01, calibrationId, 0x03, 0xff, 0xff, 0xff, 0xff, 0xff])
  }, undefined, 0x01);
  const autoZero = makePage(0x12);
  const customCalibration = makePage(0xBA);
  const manualZeroResponse = makePage(0xAC);

  assert.equal(autoZero.autoZeroSupported, true);
  assert.equal(autoZero.autoZeroEnabled, true);
  assert.match(autoZero.toString(), /Auto zero supported true, enabled true/);
  assert.match(customCalibration.toString(), /Custom Calibration Parameter Request/);
  assert.match(manualZeroResponse.toString(), /Calibration data -1/);
});

// Frame: sync, length, id, content, XOR checksum
function frame(id, content) {
  const bytes = [0xa4, content.length, id, ...content];

  return [...bytes, bytes.reduce((checksum, byte) => checksum ^ byte)];
}

test('Spec 5.1 configuration and test mode messages serialize to the documented layout', () => {
  const key = Uint8Array.from({ length: 16 }, (_, index) => index);
  const cases = [
    [new AddChannelIdMessage(0, 145, 120, 123, 1), 0x59, [0, 145, 0, 120, 123, 1]],
    [new ConfigIdListMessage(0, 2, false), 0x5a, [0, 2, 0]],
    [new ConfigIdListMessage(0, 2, true), 0x5a, [0, 2, 1]],
    [new EnableExtRxMessagesMessage(true), 0x66, [0, 1]],
    [new EnableLedMessage(false), 0x68, [0, 0]],
    [new EnableCrystalMessage(), 0x6d, [0]],
    [new ConfigFrequencyAgilityMessage(0, 5, 23, 80), 0x70, [0, 5, 23, 80]],
    [new Set128BitNetworkKeyMessage(1, key), 0x76, [1, ...key]],
    [new ConfigHighDutySearchMessage(true), 0x77, [0, 1]],
    [new ConfigHighDutySearchMessage(true, 3), 0x77, [0, 1, 3]],
    [new SetChannelSearchSharingMessage(1, 1), 0x81, [1, 1]],
    [new SetUsbDescriptorStringMessage(0, [0xcf, 0x0f, 0x08, 0x10]), 0xc7, [0, 0xcf, 0x0f, 0x08, 0x10]],
    [new SetUsbDescriptorStringMessage(3, '123'), 0xc7, [3, 0x31, 0x32, 0x33, 0]],
    [new InitCwTestModeMessage(), 0x53, [0]],
    [new CwTestModeMessage(3, 57), 0x48, [0, 3, 57]]
  ];

  for (const [message, id, content] of cases)
    assert.deepEqual(Array.from(message.serialize()), frame(id, content), message.constructor.name);
});

test('Spec 5.1 configuration messages reject invalid arguments', () => {
  assert.throws(() => new Set128BitNetworkKeyMessage(1, new Uint8Array(8)), RangeError);
  assert.throws(() => new SetUsbDescriptorStringMessage(4, 'x'), RangeError);
  assert.throws(() => new SetUsbDescriptorStringMessage(0, [1, 2]), RangeError);
});

test('Event filter and selective data update messages serialize to the documented layout', () => {
  const mask = Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0xff);
  const cases = [
    [new ConfigEventFilterMessage(0x04), 0x79, [0, 0x04, 0x00]],
    [new ConfigEventFilterMessage(0x8001), 0x79, [0, 0x01, 0x80]],
    [new ConfigSelectiveDataUpdateMessage(0, 1, true), 0x7a, [0, 0x81]],
    [new ConfigSelectiveDataUpdateMessage(2, 5), 0x7a, [2, 0x05]],
    [ConfigSelectiveDataUpdateMessage.disable(1), 0x7a, [1, 0xff]],
    [new SetSduMaskMessage(1, mask), 0x7b, [1, ...mask]]
  ];

  for (const [message, id, content] of cases)
    assert.deepEqual(Array.from(message.serialize()), frame(id, content), message.constructor.name);

  assert.throws(() => new ConfigSelectiveDataUpdateMessage(0, 32), RangeError);
  assert.throws(() => new SetSduMaskMessage(1, new Uint8Array(4)), RangeError);
});

test('EventFilterMessage and SduMaskMessage decode requested responses', () => {
  const filter = new EventFilterMessage(messageFrame(0x79, Uint8Array.of(0, 0x04, 0x80)));
  const sdu = new SduMaskMessage(messageFrame(0x7b, Uint8Array.of(3, 0, 0, 0, 0, 0, 0, 0, 0xff)));

  assert.equal(filter.eventFilter, 0x8004);
  assert.equal(filter.isFiltered(3), true);
  assert.equal(filter.isFiltered(1), false);
  assert.equal(filter.isFiltered(16), true);
  assert.equal(sdu.maskNumber, 3);
  assert.deepEqual(Array.from(sdu.mask), [0, 0, 0, 0, 0, 0, 0, 0xff]);
});

test('Extended broadcast and acknowledged data encode and decode channel ID and data', () => {
  const id = { deviceNumber: 0x1234, deviceType: 0x78, transmissionType: 0x05 };
  const data = Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8);

  for (const [Type, msgId] of [[ExtendedBroadcastDataMessage, 0x5d], [ExtendedAcknowledgedDataMessage, 0x5e]]) {
    const source = new Type();
    source.encode(2, id, data);

    assert.deepEqual(Array.from(source.serialize()), frame(msgId, [2, 0x34, 0x12, 0x78, 0x05, 1, 2, 3, 4, 5, 6, 7, 8]));

    const decoded = new Type(source.serialize());
    assert.equal(decoded.channel, 2);
    assert.equal(decoded.channelId.deviceNumber, 0x1234);
    assert.equal(decoded.channelId.deviceType, 0x78);
    assert.equal(decoded.channelId.transmissionType, 5);
    assert.deepEqual(Array.from(decoded.payload), Array.from(data));
  }

  assert.throws(() => new ExtendedBroadcastDataMessage().encode(0, id, new Uint8Array(4)), RangeError);
  assert.throws(() => new ExtendedBroadcastDataMessage().encode(0, {}, data), TypeError);
});

test('Single channel encryption configuration messages serialize per spec', () => {
  const key = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
  const cases = [
    [new AddEncryptionIdMessage(0, Uint8Array.of(1, 2, 3, 4), 2), 0x59, [0, 1, 2, 3, 4, 2]],
    [new EnableChannelEncryptionMessage(1, 2, 0, 4), 0x7d, [1, 2, 0, 4]],
    [new SetEncryptionKeyMessage(0, key), 0x7e, [0, ...key]],
    [new SetEncryptionInfoMessage(SetEncryptionInfoMessage.ENCRYPTION_ID, Uint8Array.of(0, 0, 4, 2)), 0x7f, [0, 0, 0, 4, 2]],
    [new SetEncryptionInfoMessage(SetEncryptionInfoMessage.RANDOM_NUMBER_SEED, key), 0x7f, [2, ...key]],
    [new CryptoKeyNvmOpMessage(CryptoKeyNvmOpMessage.LOAD, 1, 0), 0x83, [0, 1, 0]],
    [new CryptoKeyNvmOpMessage(CryptoKeyNvmOpMessage.STORE, 0, key), 0x83, [1, 0, ...key]]
  ];

  for (const [message, id, content] of cases)
    assert.deepEqual(Array.from(message.serialize()), frame(id, content), message.constructor.name);

  assert.throws(() => new AddEncryptionIdMessage(0, Uint8Array.of(1, 2, 3), 0), RangeError);
  assert.throws(() => new AddEncryptionIdMessage(0, Uint8Array.of(1, 2, 3, 4), 4), RangeError);
  assert.throws(() => new EnableChannelEncryptionMessage(0, 3), RangeError);
  assert.throws(() => new EnableChannelEncryptionMessage(0, 1, 0, 0), RangeError);
  assert.throws(() => new SetEncryptionKeyMessage(0, new Uint8Array(8)), RangeError);
  assert.throws(() => new SetEncryptionInfoMessage(1, new Uint8Array(4)), RangeError);
  assert.throws(() => new SetEncryptionInfoMessage(5, new Uint8Array(4)), RangeError);
  assert.throws(() => new CryptoKeyNvmOpMessage(1, 0, new Uint8Array(4)), RangeError);
  assert.throws(() => new CryptoKeyNvmOpMessage(2, 0), RangeError);
});

test('EncryptionParametersMessage decodes requested parameters', () => {
  const mode = new EncryptionParametersMessage(messageFrame(0x7d, Uint8Array.of(0, 2)));
  const id = new EncryptionParametersMessage(messageFrame(0x7d, Uint8Array.of(1, 9, 8, 7, 6)));

  assert.equal(mode.maxSupportedMode, 2);
  assert.deepEqual(Array.from(id.encryptionId), [9, 8, 7, 6]);
});

test('ChannelResponseMessage decodes encryption negotiation extended event parameters', () => {
  const info = Uint8Array.from({ length: 19 }, (_, i) => 0x30 + i);
  const success = new ChannelResponseMessage(messageFrame(0x40, Uint8Array.of(1, 1, 0x38, 1, 2, 3, 4, ...info)));
  const fail = new ChannelResponseMessage(messageFrame(0x40, Uint8Array.of(1, 1, 0x39)));

  assert.deepEqual(Array.from(success.response.encryptionId), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(success.response.userInformationString), Array.from(info));
  assert.equal(fail.response.encryptionId, undefined);
});
