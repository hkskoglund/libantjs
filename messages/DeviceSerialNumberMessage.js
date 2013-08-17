"use strict"
var  ANTMessage = require('./ANTMessage.js')

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
    
    this.serialNumber = this.content.readUInt32LE(0);
}

DeviceSerialNumberMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16) + " " + this.serialNumber;
}

module.exports = DeviceSerialNumberMessage;