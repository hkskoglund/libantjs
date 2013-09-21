"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
var  ANTMessage = require('messages/ANTMessage')

function DeviceSerialNumberMessage() {

    //if (typeof data !== "undefined") {
    //    ANTMessage.call(this, data);
    //    this.parse();
    //} else 
        ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.DEVICE_SERIAL_NUMBER;
    this.name = "Device Serial Number";
}

DeviceSerialNumberMessage.prototype = Object.create(ANTMessage.prototype);

DeviceSerialNumberMessage.prototype.constructor = DeviceSerialNumberMessage;

DeviceSerialNumberMessage.prototype.parse = function () {
    // SN 4 bytes Little Endian
    
    this.serialNumber = (new DataView(this.content)).getUint32(0,true);
    this.serialNumberAsChannelId = this.serialNumber & 0xFFFF; // Lower 2-bytes
}

DeviceSerialNumberMessage.prototype.toString = function () {
    return this.name +  " " + this.serialNumber+" lower 2-bytes "+this.serialNumberAsChannelId;
}

module.exports = DeviceSerialNumberMessage;
    return module.exports;
});