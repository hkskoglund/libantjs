"use strict"
var
    util = require('util'),
    Duplex = require('stream').Duplex;
  
function USBDevice(options) {
    //events.EventEmitter.call(this);
    // Stream inherits from event emitter
    Duplex.call(this, options);
    this._burstBuffer = new Buffer(0);
}

util.inherits(USBDevice, Duplex);

// for event emitter
USBDevice.prototype.EVENT = {

    LOG: 'log',
    ERROR : 'error'
}


USBDevice.prototype.setBurstMode = function (value) {
    this.burstMode = value;
}


USBDevice.prototype.init = function (idVendor, idProduct,callback) {
    throw new Error('Not implemented - should be overridden in descendat objects in the prototype chain');
}

USBDevice.prototype.exit = function (callback) {
    throw new Error('Not implemented - should be overridden in descendat objects in the prototype chain');
}

USBDevice.prototype.showLogMessage = function (msg) {
    console.log(Date.now(),msg);
}

// Sets device timeout in ms.
USBDevice.prototype.setDeviceTimeout = function (timeout) {
    throw new Error('Func. should be overridden in descendant objects');
}

USBDevice.prototype.listen = function (successCallback) {
    throw new Error('Func. shoule be overridden in descendant objects');
}

USBDevice.prototype.transfer = function (chunk, successCallback) {
    throw new Error('Func. shoule be overridden in descendant objects');
}

module.exports = USBDevice;