'use strict';

  var Logger = require('../util/logger'),
    EventEmitter = require('events');

  // Abstract USB device
  function USBDevice(options) {

    if (this.constructor === USBDevice) {
      throw new Error('USBDevice is abstract and cannot be instantiated directly');
    }

    EventEmitter.call(this, options);

    this.options = options ? Object.assign({}, options) : undefined;
    if (this.options)
      this.options.logSource = this;

    this.log = new Logger(this.options);

  }

  USBDevice.prototype = Object.create(EventEmitter.prototype);
  USBDevice.prototype.constructor = USBDevice;

  USBDevice.prototype.EVENT = {

    DATA: 'data',
    ENUMERATION_COMPLETE: 'enumeration_complete',
    LOG: 'log',
    ERROR: 'error',
    CLOSED: 'closed'

  };

  USBDevice.prototype.init = function(callback) {
    throw new Error('Not implemented - should be overridden in descendat objects in the prototype chain');
  };

  USBDevice.prototype.exit = function(callback) {

    throw new Error('Not implemented - should be overridden in descendat objects in the prototype chain');
  };

  // Sets device timeout in ms.
  USBDevice.prototype.setDeviceTimeout = function(timeout) {
    throw new Error('Func. should be overridden in descendant objects');
  };

  USBDevice.prototype.listen = function(successCallback) {
    throw new Error('Func. should be overridden in descendant objects');
  };

  USBDevice.prototype.transfer = function(chunk, successCallback) {
    throw new Error('Func. should be overridden in descendant objects');
  };

  USBDevice.prototype.getDeviceWatcher = function() {
    //throw new Error('Func. should be overridden in descendants objects');
    return undefined;
  };

  USBDevice.prototype.getDevicesFromManifest = function() {
    // If no deviceId available, it will try to automatically connect to the first enumerated device that matches a known ANT device

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
  };

  module.exports = USBDevice;
  
