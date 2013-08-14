"use strict"
var events = require('events'),
    util = require('util');

function USBDevice() {
    events.EventEmitter.call(this);
    this._burstBuffer = new Buffer(0);
}

util.inherits(USBDevice, events.EventEmitter);

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

USBDevice.prototype.write = function (chunk, successCallback) {
    throw new Error('Func. shoule be overridden in descendant objects');
}

module.exports = USBDevice;