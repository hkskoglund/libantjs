/* global define: true, Uint8Array: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
var ANTMessage = require('messages/ANTMessage');


function SetSerialNumChannelIdMessage(channel, deviceType, transmissionType) {

    var msgBuffer = new Uint8Array(4),
        pairingRequest = (deviceType & SetSerialNumChannelIdMessage.prototype.PAIRING_BIT_MASK) >> 7; // Bit 7 - Range 0 .. 1

    msgBuffer[0] = channel;
    msgBuffer[1] = pairingRequest;
    msgBuffer[2] = deviceType & SetSerialNumChannelIdMessage.prototype.DEVICE_TYPE_ID_BIT_MASK; // Slave: 0 = match any device type - Range 0 .. 127
    msgBuffer[3] = transmissionType; // Slave: 0 = match any transmission type

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_SERIAL_NUM_CHANNEL_ID;
    this.name = "Set serial num channel id";

    this.channel = channel;
    this.deviceType = deviceType;
    this.transmissionType = transmissionType;

    this.setContent(msgBuffer.buffer);

    //console.log("SetSerialNumChannelIdMessage", this);
}

SetSerialNumChannelIdMessage.prototype = Object.create(ANTMessage.prototype);

SetSerialNumChannelIdMessage.prototype.constructor = SetSerialNumChannelIdMessage;

SetSerialNumChannelIdMessage.prototype.PAIRING_BIT_MASK = parseInt("10000000", 2); // Bit 7 

SetSerialNumChannelIdMessage.prototype.DEVICE_TYPE_ID_BIT_MASK = parseInt("01111111", 2); // Bit 0-6

SetSerialNumChannelIdMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " deviceType" + this.deviceType + " transmissionType " + this.transmissionType;
};

module.exports = SetSerialNumChannelIdMessage;
    
    return module.exports;
});
