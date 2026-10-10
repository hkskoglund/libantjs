'use strict';

const EventEmitter = require('node:events');
const Logger = require('../util/logger');

class USBDevice extends EventEmitter {
  constructor(options = {}) {
    if (new.target === USBDevice) {
      throw new Error('USBDevice is abstract and cannot be instantiated directly');
    }

    super();

    this.options = Object.assign({}, options, { logSource: this });
    this.log = new Logger(this.options);
  }

  init(preferredDeviceIndex) {
    throw new Error('Not implemented - should be overridden in descendant objects');
  }

  exit() {
    throw new Error('Not implemented - should be overridden in descendant objects');
  }

  setDeviceTimeout(timeout) {
    throw new Error('Func. should be overridden in descendant objects');
  }

  listen() {
    throw new Error('Func. should be overridden in descendant objects');
  }

  transfer(chunk) {
    throw new Error('Func. should be overridden in descendant objects');
  }

  getDeviceWatcher() {
    return undefined;
  }

  getDevicesFromManifest() {
    // Without a device ID, connect to the first enumerated supported ANT device.
    return [
      {
        name: 'ANT USB-2 Stick',
        id: undefined,
        vendorId: 0x0FCF,
        productId: 0x1008
      },
      {
        name: 'ANT USB-m Stick',
        id: undefined,
        vendorId: 0x0FCF,
        productId: 0x1009
      }
    ];
  }

  static EVENT = {
  DATA: 'data',
  ENUMERATION_COMPLETE: 'enumeration_complete',
  LOG: 'log',
  ERROR: 'error',
  CLOSED: 'closed'
};
}



module.exports = USBDevice;
