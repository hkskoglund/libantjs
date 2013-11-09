"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    
    var Logger = require('logger');

//var  util = require('util'),
//    Duplex = require('stream').Duplex;

//var events = require('events');
  
// Abstract USB device
function USBDevice(options) {
   // events.EventEmitter.call(this);
    // Stream inherits from event emitter
//    Duplex.call(this, options);
//    this._burstBuffer = new Buffer(0);
    this.options = options;
    this.log = new Logger(options.log);
  
}

//USBDevice.prototype = Object.create(events.EventEmitter.prototype, { constructor : { value : USBDevice,
//                                                                        enumerable : false,
//                                                                        writeable : true,
//                                                                        configurable : true } });
//util.inherits(USBDevice, Duplex);
//'function (ctor, superCtor) {\n  ctor.super_ = superCtor;\n  ctor.prototype = Object.create(superCtor.prototype, {\n
//constructor: {\n      value: ctor,\n      enumerable: false,\n      writable: true,\n      configurable: true\n    }\n
//});\n}'

// for event emitter
USBDevice.prototype.EVENT = {

    LOG: 'log',
    ERROR: 'error',
    CLOSED : 'closed'
   
};

USBDevice.prototype.ANT_DEVICE_TIMEOUT = 12; // 11.11 ms to transfer 64 bytes (max. endpoint size) at 57600 bit/sec  -> 64 * 10 (1+8+1) bit = 640bit -> (640 / 57600 ) *1000 ms = 11.11 ms 

USBDevice.prototype.setBurstMode = function (value) {
    this.burstMode = value;
};

USBDevice.prototype.init = function (callback) {
    throw new Error('Not implemented - should be overridden in descendat objects in the prototype chain');
};

USBDevice.prototype.exit = function (callback) {

    throw new Error('Not implemented - should be overridden in descendat objects in the prototype chain');
};


// Sets device timeout in ms.
USBDevice.prototype.setDeviceTimeout = function (timeout) {
    throw new Error('Func. should be overridden in descendant objects');
};

USBDevice.prototype.listen = function (successCallback) {
    throw new Error('Func. shoule be overridden in descendant objects');
};

USBDevice.prototype.transfer = function (chunk, successCallback) {
    throw new Error('Func. shoule be overridden in descendant objects');
};

USBDevice.prototype.getDeviceWatcher = function () {
    //throw new Error('Func. should be overridden in descendants objects');
    return undefined;
};

module.exports = USBDevice;
    
    return module.exports;
});