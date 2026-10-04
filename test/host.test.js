'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Host = require('../host');
const Message = require('../messages/Message');

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
