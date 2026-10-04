'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Host = require('../host');

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
