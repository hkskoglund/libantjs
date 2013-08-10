"use strict"
var events = require('events'),
    util = require('util');

function USBDevice() {
    events.EventEmitter.call(this); // Call super constructor

   
}

util.inherits(USBDevice, events.EventEmitter);

// for event emitter
USBDevice.prototype.EVENT = {

    LOG: 'log',
    ERROR : 'error'
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

USBDevice.prototype.receive = function (successCallback) {
    throw new Error('Func. shoule be overridden in descendant objects');
}

USBDevice.prototype.send = function (chunk, successCallback) {
    throw new Error('Func. shoule be overridden in descendant objects');
}

module.exports = USBDevice;