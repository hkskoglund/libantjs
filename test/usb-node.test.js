'use strict';

const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const test = require('node:test');
const USBNode = require('../usb/USBNode');

function createUSB(deviceList) {
  const usb = new EventEmitter();
  usb.getDeviceList = () => deviceList;
  usb.setDebugLevel = () => {};
  return usb;
}

function createDevice(reset) {
  return {
    busNumber: 1,
    deviceAddress: 1,
    deviceDescriptor: {
      idVendor: 0x0fcf,
      idProduct: 0x1008,
      iManufacturer: 0,
      iProduct: 0
    },
    open() {},
    reset,
    close() {
      this.closeCalls = (this.closeCalls || 0) + 1;
    }
  };
}

function createExitNode(pollActive, pollTransfers) {
  const node = new USBNode({});
  node.usb = createUSB([]);
  node.device = { close() {} };
  node.inEndpoint = new EventEmitter();
  node.inEndpoint.pollActive = pollActive;
  node.inEndpoint.pollTransfers = pollTransfers;
  node.outEndpoint = new EventEmitter();
  node.deviceInterface = {
    release(closeEndpoints, callback) {
      assert.equal(closeEndpoints, true);
      callback();
    }
  };
  return node;
}

test('USBNode removes only its own shared USB listeners after reset failure', () => {
  let firstReset;
  let secondReset;
  const firstDevice = createDevice((callback) => { firstReset = callback; });
  const secondDevice = createDevice((callback) => { secondReset = callback; });
  const usb = createUSB([firstDevice, secondDevice]);
  const firstNode = new USBNode({});
  const secondNode = new USBNode({});
  const resetError = new Error('reset failed');
  let firstError;
  let secondError;

  firstNode.usb = usb;
  secondNode.usb = usb;
  firstNode.init(0, (error) => { firstError = error; });
  secondNode.init(1, (error) => { secondError = error; });

  firstReset(resetError);

  assert.equal(firstError, resetError);
  assert.equal(firstDevice.closeCalls, 1);
  assert.equal(usb.listenerCount('attach'), 1);
  assert.equal(usb.listenerCount('detach'), 1);
  assert.equal(usb.listenerCount('error'), 1);

  secondReset(resetError);

  assert.equal(secondError, resetError);
  assert.equal(secondDevice.closeCalls, 1);
  assert.equal(usb.listenerCount('attach'), 0);
  assert.equal(usb.listenerCount('detach'), 0);
  assert.equal(usb.listenerCount('error'), 0);
});

test('USBNode reports reset and close failures together', () => {
  let reset;
  const device = createDevice((callback) => { reset = callback; });
  const usb = createUSB([device]);
  const node = new USBNode({});
  const resetError = new Error('reset failed');
  const closeError = new Error('close failed');
  let callbackError;

  device.close = () => { throw closeError; };
  node.usb = usb;
  node.init(0, (error) => { callbackError = error; });
  reset(resetError);

  assert.equal(callbackError.message, 'Failed to reset and close USB device');
  assert.equal(callbackError.resetError, resetError);
  assert.equal(callbackError.closeError, closeError);
  assert.equal(usb.listenerCount('attach'), 0);
  assert.equal(usb.listenerCount('detach'), 0);
  assert.equal(usb.listenerCount('error'), 0);
});

test('USBNode exits successfully when polling was never started', () => {
  const node = createExitNode(false, undefined);
  let callbackError;

  node.exit((error) => { callbackError = error; });

  assert.equal(callbackError, undefined);
  assert.equal(node.device, null);
});

test('USBNode waits for already-stopping endpoint transfers before releasing', () => {
  const node = createExitNode(false, [{}]);
  let callbackError;
  let released = false;
  node.deviceInterface.release = (_closeEndpoints, callback) => {
    released = true;
    callback();
  };

  node.exit((error) => { callbackError = error; });

  assert.equal(released, false);
  assert.equal(callbackError, undefined);

  node.inEndpoint.emit('end');

  assert.equal(released, true);
  assert.equal(callbackError, undefined);
});
