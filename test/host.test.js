'use strict';
import assert from 'node:assert/strict';
import test from 'node:test';
import Host from '../host.js';
import Message from '../messages/message.js';
import AcknowledgedDataMessage from '../messages/data/acknowledged-data-message.js';
import ExtendedBurstDataMessage from '../messages/data/extended-burst-data-message.js';
import ANTFSHostChannel from '../profiles/antfs/antfs-host-channel.js';
import DisconnectCommand from '../profiles/antfs/lib/request-response/disconnect-request.js';










const message = {
  id: 0x4a,
  toString: () => 'test-message',
  serialize: () => Buffer.from([1])
};

function createHost() {
  const host = new Host();
  let resolveTransfer;
  let rejectTransfer;

  host.usb.transfer = () => new Promise((resolve, reject) => {
    resolveTransfer = resolve;
    rejectTransfer = reject;
  });

  return {
    host,
    completeTransfer: (error) => (error ? rejectTransfer(error) : resolveTransfer())
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

function createFrame(id) {
  const message = new Message(undefined, id);
  message.setContent(new Uint8Array(0));
  return message.serialize();
}

test('Host and channels do not mutate the caller options object', () => {
  const options = { log: false, dataDir: '/tmp/ant-data' };
  const host = new Host(options);

  assert.deepEqual(options, { log: false, dataDir: '/tmp/ant-data' });
  assert.notEqual(host.options, options);
  assert.notEqual(host.channel[0].option, host.options);
  assert.equal(host.log.options.logSource, host);
  assert.equal(host.channel[0].log.options.logSource, host.channel[0]);
});

test('Host forwards USB errors through its error event', () => {
  const { host } = createHost();
  const usbError = new Error('USB endpoint failed');
  let observedError;

  host.on(Host.EVENT.ERROR, error => { observedError = error; });
  host.usb.emit('error', usbError);

  assert.equal(observedError, usbError);
});

test('connectANTPlusSensor configures HRM and Tempe while preserving channel data events', async () => {
  const { host } = createHost();
  const channel = host.channel[0];
  const calls = [];
  const dataListener = () => {};

  host.libConfig = async (flags) => {
    calls.push(['libConfig', flags]);
  };
  channel.setNetworkKey = async (key) => {
    calls.push(['setNetworkKey', key]);
  };
  channel.assign = async (type, network) => {
    calls.push(['assign', type, network]);
  };
  channel.setId = async (number, type, transmissionType) => {
    calls.push(['setId', number, type, transmissionType]);
  };
  channel.setFrequency = async (frequency) => {
    calls.push(['setFrequency', frequency]);
  };
  channel.setPeriod = async (period) => {
    calls.push(['setPeriod', period]);
  };
  channel.open = async () => {
    calls.push(['open']);
  };

  for (const sensorType of ['hrm', 'tempe']) {
    calls.length = 0;
    channel.on('data', dataListener);

    const connectedChannel = await host.connectANTPlusSensor(0, sensorType, { deviceNumber: 1234 });

    assert.equal(connectedChannel, channel);
    assert.deepEqual(calls.map(([name]) => name), [
      'libConfig', 'setNetworkKey', 'assign', 'setId',
      'setFrequency', 'setPeriod', 'open'
    ]);
    assert.deepEqual(calls[0], ['libConfig', 0x80]);
    assert.deepEqual(calls[2], ['assign', channel.constructor.SLAVE_RECEIVE_ONLY, 0]);
    assert.deepEqual(calls[3], ['setId', 1234, sensorType === 'hrm' ? 120 : 25, 0]);
    assert.deepEqual(calls[4], ['setFrequency', channel.constructor.NET.FREQUENCY['ANT+']]);
    assert.deepEqual(calls[5], [
      'setPeriod',
      sensorType === 'hrm' ? 8070 : channel.constructor.NET.PERIOD.ENVIRONMENT.LOW_POWER
    ]);
    assert.equal(channel.listeners('data').includes(dataListener), true);
    channel.removeListener('data', dataListener);
  }
});

test('connectANTPlusSensor reports unsupported sensors and stops after setup errors', async () => {
  const { host } = createHost();
  const channel = host.channel[0];
  const calls = [];
  const setupError = new Error('channel ID setup failed');

  host.libConfig = async () => {};
  channel.setNetworkKey = async () => {};
  channel.assign = async () => {};
  channel.setId = async () => { throw setupError; };
  channel.setFrequency = async () => calls.push('setFrequency');
  channel.setPeriod = async () => calls.push('setPeriod');
  channel.open = async () => calls.push('open');

  await assert.rejects(host.connectANTPlusSensor(0, 'hrm'), setupError);
  assert.deepEqual(calls, []);

  await assert.rejects(host.connectANTPlusSensor(0, 'unsupported'), {
    name: 'RangeError',
    message: /Unsupported ANT\+ sensor type/
  });
});

test('connectANTFS accepts an options object and preserves the positional form', async () => {
  const { host } = createHost();
  const originalConnect = ANTFSHostChannel.prototype.connect;
  const cases = [
    {
      args: [2, {
        net: 1,
        deviceNumber: 1234,
        hostname: 'test-host',
        download: true,
        erase: false,
        ls: true,
        skipNewFiles: true
      }],
      expected: {
        net: 1,
        deviceNumber: 1234,
        hostname: 'test-host',
        download: true,
        erase: false,
        ls: true,
        skipNewFiles: true
      }
    },
    {
      args: [3, 2, 5678, 'legacy-host', true, true, false, true],
      expected: {
        net: 2,
        deviceNumber: 5678,
        hostname: 'legacy-host',
        download: true,
        erase: true,
        ls: false,
        skipNewFiles: true
      }
    },
    {
      args: [4, 2, 9876, 'legacy-host', true, false, true, false],
      expected: {
        net: 2,
        deviceNumber: 9876,
        hostname: 'legacy-host',
        download: true,
        erase: false,
        ls: true,
        skipNewFiles: false
      }
    }
  ];

  ANTFSHostChannel.prototype.connect = async function() {
    this.connected = true;
  };

  try {
    for (const { args, expected } of cases) {
      const antfsHost = await host.connectANTFS(...args);

      assert.equal(host.channel[args[0]], antfsHost);

      for (const [key, value] of Object.entries(expected)) {
        assert.equal(antfsHost.option[key], value, key);
      }
      assert.equal(antfsHost.connected, true);
      assert.equal(antfsHost.constructor, ANTFSHostChannel);
    }
  } finally {
    ANTFSHostChannel.prototype.connect = originalConnect;
  }
});

test('sendMessage rejects when a transfer without a response event fails', async () => {
  const { host, completeTransfer } = createHost();
  const transferError = new Error('transfer failed');

  const sent = host.sendMessage(message);
  completeTransfer(transferError);

  await assert.rejects(sent, transferError);
});

test('sendMessage removes a host response listener when the transfer fails', async () => {
  const { host, completeTransfer } = createHost();
  const transferError = new Error('transfer failed');

  const sent = host.sendMessage(message, 'response');
  assert.equal(host.listenerCount('response'), 1);
  completeTransfer(transferError);

  await assert.rejects(sent, transferError);
  assert.equal(host.listenerCount('response'), 0);
});

test('sendMessage removes a channel response listener when the transfer fails', async () => {
  const { host, completeTransfer } = createHost();
  const transferError = new Error('transfer failed');
  const responseEvent = 'response_0x4a';

  const sent = host.sendMessage(message, 'response', 0);
  assert.equal(host.channel[0].listenerCount(responseEvent), 1);
  completeTransfer(transferError);

  await assert.rejects(sent, transferError);
  assert.equal(host.channel[0].listenerCount(responseEvent), 0);
});

test('sendMessage resolves eventless transfers on USB completion', async () => {
  const { host, completeTransfer } = createHost();

  const sent = host.sendMessage(message);
  completeTransfer();

  assert.equal(await sent, undefined);
});

test('ANT-FS pads short acknowledged requests to the ANT payload size', async () => {
  let encodedMessage;
  const antfsChannel = {
    channel: 0,
    host: {
      sendAcknowledgedData(channel, data) {
        encodedMessage = new AcknowledgedDataMessage();
        encodedMessage.encode(channel, data);
      }
    },
    sendRequest() {
      this.session.sendFunc();
    }
  };

  await ANTFSHostChannel.prototype.initRequest.call(antfsChannel, new DisconnectCommand());

  assert.deepEqual(Array.from(encodedMessage.payload), [0x44, 0x03, 0, 0, 0, 0, 0, 0]);
});

test('sendMessage resolves with the response event without resolving on USB completion', async () => {
  const { host, completeTransfer } = createHost();
  const response = { ok: true };
  let settled = false;

  const sent = host.sendMessage(message, 'response', 0).then((result) => {
    settled = true;
    return result;
  });

  completeTransfer();
  await flush();
  assert.equal(settled, false);

  host.channel[0].emit('response_0x4a', undefined, response);
  assert.equal(await sent, response);
});

test('sendMessage rejects when the response event carries an error', async () => {
  const { host, completeTransfer } = createHost();
  const responseError = new Error('response failed');

  const sent = host.sendMessage(message, 'response', 0);
  completeTransfer();
  await flush();
  host.channel[0].emit('response_0x4a', responseError);

  await assert.rejects(sent, responseError);
});

test('Host.sleep sends a Sleep Message', async () => {
  const { host } = createHost();
  let sentMessage;

  host.sendMessage = async message => { sentMessage = message; };
  await host.sleep();

  assert.equal(sentMessage.id, Message.SLEEP_MESSAGE);
  assert.deepEqual(Array.from(sentMessage.serialize()), [0xa4, 0x01, 0xc5, 0x00, 0x60]);
});

test('Host sends extended burst packets with sequence and Channel ID fields', async () => {
  const { host } = createHost();
  const sent = [];
  const channelId = { deviceNumber: 0x1234, deviceType: 0x56, transmissionType: 0x78 };
  const payload = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  host.sendMessage = async (message) => {
    sent.push(message);
  };

  await host.sendExtendedBurstTransfer(2, channelId, payload);

  assert.equal(sent.length, 2);
  assert.ok(sent.every(message => message instanceof ExtendedBurstDataMessage));
  assert.equal(sent[0].sequenceNr, 0);
  assert.equal(sent[1].sequenceNr, 5);
  assert.equal(sent[0].channelId.deviceNumber, 0x1234);
  assert.deepEqual(Array.from(sent[1].packet), [9, 0, 0, 0, 0, 0, 0, 0]);
});

test('Host.deserialize emits extended burst packets and the completed burst', () => {
  const { host } = createHost();
  const channel = host.channel[1];
  const packets = [];
  let completedBurst;
  const channelId = { deviceNumber: 0x1234, deviceType: 0x56, transmissionType: 0x78 };
  const first = new ExtendedBurstDataMessage();
  const last = new ExtendedBurstDataMessage();

  channel.on('extburstdata', message => packets.push(message));
  channel.on('burst', payload => { completedBurst = payload; });
  first.encode(1, channelId, Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]));
  last.encode(0xA1, channelId, Uint8Array.from([9, 10, 11, 12, 13, 14, 15, 16]));

  host.deserialize(Buffer.concat([Buffer.from(first.serialize()), Buffer.from(last.serialize())]));

  assert.equal(packets.length, 2);
  assert.deepEqual(Array.from(completedBurst), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
});

test('Host.deserialize reports frames with invalid CRCs and continues parsing', () => {
  const { host } = createHost();
  const errors = [];
  const firstFrame = createFrame(0x01);
  const secondFrame = createFrame(0x02);

  firstFrame[firstFrame.length - 1] ^= 0xff;
  host.on(Host.EVENT.ERROR, (error) => errors.push(error));
  host.deserialize(Buffer.concat([firstFrame, secondFrame]));

  assert.deepEqual(errors, ['Invalid message CRC', 'Unable to parse received msg id 2']);
});

test('Host.deserialize buffers incomplete frames and clears them after parsing', () => {
  const { host } = createHost();
  const frame = createFrame(0x01);
  const errors = [];

  host.on(Host.EVENT.ERROR, (error) => errors.push(error));
  host.deserialize(frame.subarray(0, frame.length - 1));
  assert.equal(host.previousPacket.length, frame.length - 1);

  host.deserialize(frame.subarray(frame.length - 1));
  assert.equal(host.previousPacket, undefined);
  assert.deepEqual(errors, ['Unable to parse received msg id 1']);
});

test('Host.exit propagates a reset error and still exits USB', async () => {
  const { host } = createHost();
  const resetError = new Error('reset failed');
  let usbExitCalls = 0;

  host.resetSystem = async () => { throw resetError; };
  host.usb.exit = async () => { usbExitCalls++; };

  await assert.rejects(host.exit(), resetError);
  assert.equal(usbExitCalls, 1);
});

test('Host.exit propagates a USB exit error', async () => {
  const { host } = createHost();
  const usbExitError = new Error('USB exit failed');

  host.resetSystem = async () => {};
  host.usb.exit = async () => { throw usbExitError; };

  await assert.rejects(host.exit(), usbExitError);
});

test('Host.exit preserves both errors when reset and USB exit fail', async () => {
  const { host } = createHost();
  const resetError = new Error('reset failed');
  const usbExitError = new Error('USB exit failed');

  host.resetSystem = async () => { throw resetError; };
  host.usb.exit = async () => { throw usbExitError; };

  await assert.rejects(host.exit(), (error) => {
    assert.ok(error instanceof Error);
    assert.equal(error.resetError, resetError);
    assert.equal(error.usbExitError, usbExitError);
    return true;
  });
});

test('Channel.getStatus forwards errors without updating channel state', async () => {
  const { host } = createHost();
  const channel = host.channel[0];
  const statusError = new Error('status request failed');
  channel.state = channel.TRACKING;
  host.getChannelStatus = async () => { throw statusError; };

  await assert.rejects(channel.getStatus(), statusError);
  assert.equal(channel.state, channel.TRACKING);
});

test('Channel.assign accepts an omitted extended assignment', async () => {
  const { host } = createHost();
  const channel = host.channel[0];
  const calls = [];

  host.assignChannel = async (...args) => { calls.push(args); };

  await channel.assign(channel.constructor.SLAVE_RECEIVE_ONLY, 1);
  await channel.assign(channel.constructor.SLAVE_RECEIVE_ONLY, 1, 0x01);

  assert.deepEqual(calls, [
    [0, channel.constructor.SLAVE_RECEIVE_ONLY, 1, undefined],
    [0, channel.constructor.SLAVE_RECEIVE_ONLY, 1, 0x01]
  ]);
  assert.equal(channel.extendedAssignment, 0x01);
});

test('Channel.toString includes zero-valued network, type, and state', () => {
  const { host } = createHost();
  const channel = host.channel[0];
  channel.state = channel.constructor.UNASSIGNED;
  const description = channel.toString();

  assert.match(description, /Net 0\|/);
  assert.match(description, /Bidirectional SLAVE\|/);
  assert.match(description, /Unassigned\|/);
});

test('Host.sendBurstTransfer sends sequenced packets and stops on the first failure', async () => {
  const { host } = createHost();
  const sent = [];
  const failure = new Error('burst failed');

  host.sendBurstTransferPacket = async (sequenceChannel, packet) => {
    sent.push([sequenceChannel, packet.byteLength]);
    if (sent.length === 3) throw failure;
  };

  await assert.rejects(host.sendBurstTransfer(1, new Uint8Array(40)), failure);
  assert.deepEqual(sent, [[0x01, 8], [0x21, 8], [0x41, 8]]);

  sent.length = 0;
  host.sendBurstTransferPacket = async (sequenceChannel, packet) => { sent.push([sequenceChannel, packet.byteLength]); };
  await host.sendBurstTransfer(1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1);
  assert.deepEqual(sent, [[0x01, 8], [0xA1, 8]]);
});

test('Host.resetSystem resolves with the startup notification after the settle delay', async (t) => {
  const { host } = createHost();
  const startup = { startup: true };

  t.mock.timers.enable({ apis: ['setTimeout'] });
  host.sendMessage = async () => startup;

  const reset = host.resetSystem();
  await flush();
  t.mock.timers.tick(500);

  assert.equal(await reset, startup);
});

test('Channel.connect configures and opens the channel in order', async () => {
  const { host } = createHost();
  const channel = host.channel[0];
  const calls = [];

  host.setNetworkKey = async () => calls.push('setNetworkKey');
  host.assignChannel = async () => calls.push('assign');
  host.setChannelId = async () => calls.push('setId');
  host.setChannelRFFreq = async () => calls.push('setFrequency');
  host.setChannelPeriod = async () => calls.push('setPeriod');
  host.setLowPriorityChannelSearchTimeout = async () => calls.push('setLowPriorityTimeout');
  host.openChannel = async () => calls.push('open');

  await channel.connect();

  assert.deepEqual(calls, ['setNetworkKey', 'assign', 'setId', 'setFrequency', 'setPeriod', 'setLowPriorityTimeout', 'open']);
});
