'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Host = require('../host');
const Message = require('../messages/message');
const ExtendedBurstDataMessage = require('../messages/data/extended-burst-data-message');
const ANTFSHostChannel = require('../profiles/antfs/antfs-host-channel');

const message = {
  id: 0x4a,
  toString: () => 'test-message',
  serialize: () => Buffer.from([1])
};

function createHost() {
  const host = new Host();
  let transferCallback;

  host.usb.transfer = (_bytes, callback) => {
    transferCallback = callback;
  };

  return {
    host,
    completeTransfer: (error, result) => transferCallback(error, result)
  };
}

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

  host.on(Host.prototype.EVENT.ERROR, error => { observedError = error; });
  host.usb.emit('error', usbError);

  assert.equal(observedError, usbError);
});

test('connectANTPlusSensor configures HRM and Tempe while preserving channel data events', () => {
  const { host } = createHost();
  const channel = host.channel[0];
  const calls = [];
  const dataListener = () => {};

  host.libConfig = (flags, callback) => {
    calls.push(['libConfig', flags]);
    callback();
  };
  channel.setNetworkKey = (key, callback) => {
    calls.push(['setNetworkKey', key]);
    callback();
  };
  channel.assign = (type, network, callback) => {
    calls.push(['assign', type, network]);
    callback();
  };
  channel.setId = (number, type, transmissionType, callback) => {
    calls.push(['setId', number, type, transmissionType]);
    callback();
  };
  channel.setFrequency = (frequency, callback) => {
    calls.push(['setFrequency', frequency]);
    callback();
  };
  channel.setPeriod = (period, callback) => {
    calls.push(['setPeriod', period]);
    callback();
  };
  channel.open = callback => {
    calls.push(['open']);
    callback();
  };

  for (const sensorType of ['hrm', 'tempe']) {
    calls.length = 0;
    channel.on('data', dataListener);
    let callbackChannel;

    assert.equal(host.connectANTPlusSensor(
      0,
      sensorType,
      { deviceNumber: 1234 },
      (error, connectedChannel) => {
        assert.equal(error, undefined);
        callbackChannel = connectedChannel;
      }
    ), channel);

    assert.equal(callbackChannel, channel);
    assert.deepEqual(calls.map(([name]) => name), [
      'libConfig', 'setNetworkKey', 'assign', 'setId',
      'setFrequency', 'setPeriod', 'open'
    ]);
    assert.deepEqual(calls[0], ['libConfig', 0x20]);
    assert.deepEqual(calls[2], ['assign', channel.SLAVE_RECEIVE_ONLY, 0]);
    assert.deepEqual(calls[3], ['setId', 1234, sensorType === 'hrm' ? 120 : 25, 0]);
    assert.deepEqual(calls[4], ['setFrequency', channel.NET.FREQUENCY['ANT+']]);
    assert.deepEqual(calls[5], [
      'setPeriod',
      sensorType === 'hrm' ? 8070 : channel.NET.PERIOD.ENVIRONMENT.LOW_POWER
    ]);
    assert.equal(channel.listeners('data').includes(dataListener), true);
    channel.removeListener('data', dataListener);
  }
});

test('connectANTPlusSensor reports unsupported sensors and stops after setup errors', () => {
  const { host } = createHost();
  const channel = host.channel[0];
  const calls = [];
  const setupError = new Error('channel ID setup failed');
  let receivedError;

  host.libConfig = (_flags, callback) => callback();
  channel.setNetworkKey = (_key, callback) => callback();
  channel.assign = (_type, _network, callback) => callback();
  channel.setId = (_number, _type, _transmissionType, callback) => callback(setupError);
  channel.setFrequency = () => calls.push('setFrequency');
  channel.setPeriod = () => calls.push('setPeriod');
  channel.open = () => calls.push('open');

  host.connectANTPlusSensor(0, 'hrm', error => { receivedError = error; });
  assert.equal(receivedError, setupError);
  assert.deepEqual(calls, []);

  host.connectANTPlusSensor(0, 'unsupported', error => { receivedError = error; });
  assert.ok(receivedError instanceof RangeError);
  assert.match(receivedError.message, /Unsupported ANT\+ sensor type/);
});

test('connectANTFS accepts an options object and preserves the positional form', () => {
  const { host } = createHost();
  const originalConnect = ANTFSHostChannel.prototype.connect;
  const searchCallback = () => {};
  const cases = [
    {
      args: [2, {
        net: 1,
        deviceNumber: 1234,
        hostname: 'test-host',
        download: true,
        erase: false,
        ls: true,
        skipNewFiles: true,
        onSearching: searchCallback
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
      args: [3, 2, 5678, 'legacy-host', true, true, false, true, searchCallback],
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
      args: [4, 2, 9876, 'legacy-host', true, false, true, false, true, searchCallback],
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

  ANTFSHostChannel.prototype.connect = function(callback) {
    this.searchCallback = callback;
  };

  try {
    for (const { args, expected } of cases) {
      host.connectANTFS(...args);
      const antfsHost = host.channel[args[0]];

      for (const [key, value] of Object.entries(expected)) {
        assert.equal(antfsHost.option[key], value, key);
      }
      assert.equal(antfsHost.searchCallback, searchCallback);
      assert.equal(antfsHost.constructor, ANTFSHostChannel);
    }
  } finally {
    ANTFSHostChannel.prototype.connect = originalConnect;
  }
});

test('sendMessage calls the callback once when a transfer without a response event fails', () => {
  const { host, completeTransfer } = createHost();
  const transferError = new Error('transfer failed');
  let callbackCalls = 0;

  host.sendMessage(message, undefined, undefined, (error, result) => {
    callbackCalls++;
    assert.equal(error, transferError);
    assert.equal(result, 'transfer result');
  });
  completeTransfer(transferError, 'transfer result');

  assert.equal(callbackCalls, 1);
});

test('sendMessage removes a host response listener when the transfer fails', () => {
  const { host, completeTransfer } = createHost();
  const transferError = new Error('transfer failed');
  let callbackCalls = 0;

  host.sendMessage(message, 'response', undefined, (error) => {
    callbackCalls++;
    assert.equal(error, transferError);
  });
  completeTransfer(transferError);

  assert.equal(callbackCalls, 1);
  assert.equal(host.listenerCount('response'), 0);
});

test('sendMessage removes a channel response listener when the transfer fails', () => {
  const { host, completeTransfer } = createHost();
  const transferError = new Error('transfer failed');
  const responseEvent = 'response_0x4a';
  let callbackCalls = 0;

  host.sendMessage(message, 'response', 0, (error) => {
    callbackCalls++;
    assert.equal(error, transferError);
  });
  completeTransfer(transferError);

  assert.equal(callbackCalls, 1);
  assert.equal(host.channel[0].listenerCount(responseEvent), 0);
});

test('sendMessage delivers successful response events without calling the callback on USB completion', () => {
  const { host, completeTransfer } = createHost();
  const response = { ok: true };
  let callbackCalls = 0;

  host.sendMessage(message, 'response', 0, (error, result) => {
    callbackCalls++;
    assert.equal(error, undefined);
    assert.equal(result, response);
  });

  test('Host.sleep sends a Sleep Message', () => {
    const { host } = createHost();
    let sentMessage;

    host.sendMessage = message => { sentMessage = message; };
    host.sleep(() => {});

    assert.equal(sentMessage.id, Message.prototype.SLEEP_MESSAGE);
    assert.deepEqual(Array.from(sentMessage.serialize()), [0xa4, 0x01, 0xc5, 0x00, 0x60]);
  });

  test('Host sends extended burst packets with sequence and Channel ID fields', () => {
    const { host } = createHost();
    const sent = [];
    const channelId = { deviceNumber: 0x1234, deviceType: 0x56, transmissionType: 0x78 };
    const payload = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    host.sendMessage = (message, _event, _channel, callback) => {
      sent.push(message);
      callback();
    };

    host.sendExtendedBurstTransfer(2, channelId, payload, error => {
      assert.equal(error, undefined);
    });

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
  completeTransfer(undefined, 'transfer result');
  assert.equal(callbackCalls, 0);

  host.channel[0].emit('response_0x4a', undefined, response);
  assert.equal(callbackCalls, 1);
});

test('Host.deserialize reports frames with invalid CRCs and continues parsing', () => {
  const { host } = createHost();
  const errors = [];
  const firstFrame = createFrame(0x01);
  const secondFrame = createFrame(0x02);

  firstFrame[firstFrame.length - 1] ^= 0xff;
  host.on(host.EVENT.ERROR, (error) => errors.push(error));
  host.deserialize(Buffer.concat([firstFrame, secondFrame]));

  assert.deepEqual(errors, ['Invalid message CRC', 'Unable to parse received msg id 2']);
});

test('Host.deserialize buffers incomplete frames and clears them after parsing', () => {
  const { host } = createHost();
  const frame = createFrame(0x01);
  const errors = [];

  host.on(host.EVENT.ERROR, (error) => errors.push(error));
  host.deserialize(frame.subarray(0, frame.length - 1));
  assert.equal(host.previousPacket.length, frame.length - 1);

  host.deserialize(frame.subarray(frame.length - 1));
  assert.equal(host.previousPacket, undefined);
  assert.deepEqual(errors, ['Unable to parse received msg id 1']);
});

test('Host.exit propagates a reset error and still exits USB', () => {
  const { host } = createHost();
  const resetError = new Error('reset failed');
  let usbExitCalls = 0;

  host.resetSystem = (callback) => callback(resetError);
  host.usb.exit = (callback) => {
    usbExitCalls++;
    callback();
  };

  return new Promise((resolve) => {
    host.exit((error) => {
      assert.equal(error, resetError);
      assert.equal(usbExitCalls, 1);
      resolve();
    });
  });
});

test('Host.exit propagates a USB exit error', async () => {
  const { host } = createHost();
  const usbExitError = new Error('USB exit failed');

  host.resetSystem = (callback) => callback();
  host.usb.exit = (callback) => callback(usbExitError);

  await new Promise((resolve) => {
    host.exit((error) => {
      assert.equal(error, usbExitError);
      resolve();
    });
  });
});

test('Host.exit preserves both errors when reset and USB exit fail', async () => {
  const { host } = createHost();
  const resetError = new Error('reset failed');
  const usbExitError = new Error('USB exit failed');

  host.resetSystem = (callback) => callback(resetError);
  host.usb.exit = (callback) => callback(usbExitError);

  await new Promise((resolve) => {
    host.exit((error) => {
      assert.ok(error instanceof Error);
      assert.equal(error.resetError, resetError);
      assert.equal(error.usbExitError, usbExitError);
      resolve();
    });
  });
});

test('Channel.getStatus forwards errors without updating channel state', () => {
  const { host } = createHost();
  const channel = host.channel[0];
  const statusError = new Error('status request failed');
  channel.state = channel.TRACKING;
  host.getChannelStatus = (_channel, callback) => callback(statusError);

  channel.getStatus((error, status) => {
    assert.equal(error, statusError);
    assert.equal(status, undefined);
    assert.equal(channel.state, channel.TRACKING);
  });
});

test('Channel.assign accepts an omitted extended assignment before the callback', () => {
  const { host } = createHost();
  const channel = host.channel[0];
  const callback = () => {};
  let assignArguments;

  host.assignChannel = function() {
    assignArguments = Array.prototype.slice.call(arguments);
  };

  channel.assign(channel.BIDIRECTIONAL_SLAVE, 0, undefined, callback);

  assert.equal(assignArguments[0], channel.channel);
  assert.equal(assignArguments[1], channel.BIDIRECTIONAL_SLAVE);
  assert.equal(assignArguments[2], 0);
  assert.equal(assignArguments[3], callback);
  assert.equal(assignArguments.length, 4);
});

test('Channel.toString includes zero-valued network, type, and state', () => {
  const { host } = createHost();
  const channel = host.channel[0];
  channel.state = channel.UNASSIGNED;
  const description = channel.toString();

  assert.match(description, /Net 0\|/);
  assert.match(description, /Bidirectional SLAVE\|/);
  assert.match(description, /Unassigned\|/);
});
