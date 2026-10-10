'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const USBNode = require('../usb/USBNode');

function createUSB(deviceList) {
  const listeners = {};
  return {
    listeners,
    getDevices: async () => deviceList,
    addEventListener(type, listener) {
      (listeners[type] = listeners[type] || new Set()).add(listener);
    },
    removeEventListener(type, listener) {
      (listeners[type] = listeners[type] || new Set()).delete(listener);
    },
    listenerCount(type) {
      return listeners[type] ? listeners[type].size : 0;
    }
  };
}

function createDevice(overrides = {}) {
  const calls = [];
  const record = (name, result) => async (...args) => {
    calls.push(name);
    if (typeof result === 'function') {
      return result(...args);
    }
    return result;
  };
  return Object.assign({
    calls,
    bus: '001',
    address: 1,
    vendorId: 0x0fcf,
    productId: 0x1008,
    manufacturerName: 'Dynastream Innovations',
    productName: 'ANT USB-2 Stick',
    get configuration() {
      throw new Error('getString error: invalid descriptor');
    },
    open: record('open'),
    reset: record('reset'),
    close: record('close'),
    claimInterface: record('claimInterface'),
    releaseInterface: record('releaseInterface'),
    detachKernelDriver: record('detachKernelDriver'),
    attachKernelDriver: record('attachKernelDriver'),
    transferIn: record('transferIn', async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      throw new Error('Cancelled');
    }),
    transferOut: record('transferOut', async (_endpoint, data) => ({ bytesWritten: data.length, status: 'ok' }))
  }, overrides);
}

// Settles an async method into [error, result]
const settle = (node, method, ...args) => node[method](...args).then((result) => [undefined, result], (error) => [error]);

test('USBNode filters ANT devices and refreshes the sync device list', async () => {
  const ant = createDevice();
  const other = createDevice({ vendorId: 1, productId: 2 });
  const node = new USBNode({});
  node.usb = createUSB([other, ant]);

  assert.deepEqual(node.getDevices(), []);
  const [error, devices] = await settle(node, 'refreshDevices');

  assert.equal(error, undefined);
  assert.deepEqual(devices, [ant]);
  assert.deepEqual(node.getDevices(), [ant]);
});

test('USBNode describes devices', () => {
  const node = new USBNode({});
  const device = createDevice();

  assert.equal(node.deviceToString(device), 'Bus 001 Number 1: ID fcf:1008 Dynastream Innovations, ANT USB-2 Stick');
});

test('USBNode emits errors from endpoint events', () => {
  const node = new USBNode({});
  const inError = new Error('in endpoint failed');
  const usbError = new Error('USB runtime failed');
  const errors = [];

  node.on(USBNode.prototype.EVENT.ERROR, error => errors.push(error));
  node._onInEndpointError(inError);
  node._onError(usbError);

  assert.deepEqual(errors, [inError, usbError]);
});

test('USBNode emits endpoint data as a copied Uint8Array', () => {
  const node = new USBNode();
  const input = Buffer.from([1, 2, 3]);
  let receivedData;

  node.on('data', data => { receivedData = data; });
  node._onInEndpointData(input);
  input[0] = 9;

  assert.ok(receivedData instanceof Uint8Array);
  assert.deepEqual(Array.from(receivedData), [1, 2, 3]);
});

test('USBNode reports no-device errors to both its error event and init rejection', async () => {
  const node = new USBNode({});
  node.usb = createUSB([]);
  let emittedError;

  node.on('error', error => { emittedError = error; });
  const [callbackError] = await settle(node, 'init', 0);

  assert.equal(callbackError, emittedError);
  assert.equal(callbackError.message, 'No device');
  assert.equal(callbackError.code, -1);
  assert.equal(node.usb.listenerCount('connect'), 0);
  assert.equal(node.usb.listenerCount('disconnect'), 0);
});

test('USBNode reports reset and close failures together and removes its listeners', async () => {
  const resetError = new Error('reset failed');
  const closeError = new Error('close failed');
  const device = createDevice({
    reset: async () => { throw resetError; },
    close: async () => { throw closeError; }
  });
  const node = new USBNode({});
  node.usb = createUSB([device]);

  const [callbackError] = await settle(node, 'init', 0);

  assert.equal(callbackError.message, 'Failed to reset and close USB device');
  assert.equal(callbackError.resetError, resetError);
  assert.equal(callbackError.closeError, closeError);
  assert.equal(node.usb.listenerCount('connect'), 0);
  assert.equal(node.usb.listenerCount('disconnect'), 0);
});

test('USBNode opens, resets and claims the interface using default endpoints', async () => {
  const device = createDevice({
    detachKernelDriver: async () => { throw new Error('no kernel driver attached'); }
  });
  const node = new USBNode({});
  node.usb = createUSB([device]);

  const [error] = await settle(node, 'init', 0);

  assert.equal(error, undefined);
  assert.deepEqual(device.calls, ['open', 'reset', 'claimInterface']);
  assert.equal(node.inEndpoint.endpointNumber, 1);
  assert.equal(node._getINEndpointPacketSize(), 64);
  assert.equal(node.usb.listenerCount('connect'), 1);
  assert.equal(node.usb.listenerCount('disconnect'), 1);
});

test('USBNode closes the device when claiming fails', async () => {
  const claimError = new Error('claim failed');
  const device = createDevice({ claimInterface: async () => { throw claimError; } });
  const node = new USBNode({});
  node.usb = createUSB([device]);

  const [error] = await settle(node, 'init', 0);

  assert.equal(error, claimError);
  assert.deepEqual(device.calls, ['open', 'reset', 'detachKernelDriver', 'close']);
  assert.equal(node.usb.listenerCount('connect'), 0);
});

test('USBNode polls, transmits, and exits with kernel driver reattached', async () => {
  let reads = 0;
  const device = createDevice({
    transferIn: async () => {
      reads++;
      if (reads === 1) {
        return { status: 'ok', data: new DataView(new Uint8Array([0xa4, 1, 0x6f, 0x20, 0xea]).buffer) };
      }
      await new Promise(resolve => setTimeout(resolve, 5));
      throw new Error('Cancelled');
    }
  });
  const node = new USBNode({});
  node.usb = createUSB([device]);
  const received = [];
  node.on('data', data => received.push(Array.from(data)));

  assert.equal((await settle(node, 'init', 0))[0], undefined);
  node.listen();
  const [sendError] = await settle(node, 'transfer', [1, 2, 3]);
  assert.equal(sendError, undefined);
  const [exitError] = await settle(node, 'exit');

  assert.equal(exitError, undefined);
  assert.deepEqual(received, [[0xa4, 1, 0x6f, 0x20, 0xea]]);
  assert.equal(node.device, null);
  assert.deepEqual(device.calls.slice(-3), ['releaseInterface', 'attachKernelDriver', 'close']);
  assert.equal(node.usb.listenerCount('connect'), 0);
});

test('USBNode emits polling errors and stops polling', async () => {
  const pollError = new Error('device gone');
  const device = createDevice({ transferIn: async () => { throw pollError; } });
  const node = new USBNode({});
  node.usb = createUSB([device]);
  const errors = [];
  node.on('error', error => errors.push(error));

  await settle(node, 'init', 0);
  node.listen();
  await node.pollPromise;

  assert.deepEqual(errors, [pollError]);
  assert.equal(node.polling, false);
});

test('USBNode transfer reports a closed device', async () => {
  const node = new USBNode({});

  await assert.rejects(node.transfer([1]), { message: 'USB device closed' });
});

test('USBNode exit without a device reports no-device error', async () => {
  const node = new USBNode({});
  node.on('error', () => {});

  const [error] = await settle(node, 'exit');

  assert.equal(error.message, 'No device');
});

test('USBNode preserves error listeners after exit', async () => {
  const device = createDevice();
  const node = new USBNode({});
  node.usb = createUSB([device]);
  const expectedError = new Error('USB runtime failed');
  let observedError;

  await settle(node, 'init', 0);
  node.on('error', error => { observedError = error; });
  await settle(node, 'exit');
  node.emit('error', expectedError);

  assert.equal(observedError, expectedError);
});

test('USBNode emits attach and detach for ANT devices only', async () => {
  const ant = createDevice();
  const node = new USBNode({});
  node.usb = createUSB([ant]);
  const events = [];
  node.on('attach', device => events.push(['attach', device]));
  node.on('detach', device => events.push(['detach', device]));

  node._onAttach({ device: createDevice({ vendorId: 1, productId: 2 }) });
  node._onAttach({ device: ant });
  node._onDetach({ device: ant });
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(events, [['attach', ant], ['detach', ant]]);
});
