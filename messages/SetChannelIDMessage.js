/* global define: true, DataView: true, ArrayBuffer: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
var ANTMessage = require('messages/ANTMessage');


function SetChannelIDMessage(channel, deviceNum, deviceType, transmissionType) {

    var msgBuffer = new DataView(new ArrayBuffer(5)),
        pairingRequest = (deviceType & SetChannelIDMessage.prototype.PAIRING_BIT_MASK) >> 7; // Bit 7 - Range 0 .. 1

    msgBuffer.setUint8(0,channel);
    msgBuffer.setUint16(1,deviceNum, true);
    msgBuffer.setUint8(3,deviceType); // Slave: 0 = match any device type - Range 0 .. 127 if no pairing
    msgBuffer.setUint8(4, transmissionType); // Slave: 0 = match any transmission type

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_ID;
    this.name = "Set channel id";
    this.type = ANTMessage.prototype.TYPE.REQUEST;
    this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)

    this.channel = channel;
    this.deviceNumber = deviceNum;
    this.deviceType = deviceType;
    this.transmissionType = transmissionType;
    this.pair = pairingRequest;

    this.setContent(msgBuffer.buffer);

    //console.log("SetChannelIDMessage", this);
}

SetChannelIDMessage.prototype = Object.create(ANTMessage.prototype);

SetChannelIDMessage.prototype.constructor = SetChannelIDMessage;

SetChannelIDMessage.prototype.PAIRING_BIT_MASK = parseInt("10000000", 2); // Bit 7 

SetChannelIDMessage.prototype.DEVICE_TYPE_ID_BIT_MASK = parseInt("01111111", 2); // Bit 0-6

SetChannelIDMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " deviceNumber " + this.deviceNumber + " deviceType " + this.deviceType + " transmissionType " + this.transmissionType;
};

module.exports = SetChannelIDMessage;
    return module.exports;
});
