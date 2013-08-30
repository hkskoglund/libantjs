"use strict";

var ANTMessage = require('../ANTMessage.js');


function SetChannelIDMessage(channel, deviceNum, deviceType, transmissionType) {

    var msgBuffer = new Buffer(5),
        pairingRequest = (deviceType & SetChannelIDMessage.prototype.PAIRING_BIT_MASK) >> 7; // Bit 7 - Range 0 .. 1

    msgBuffer[0] = channel;
    msgBuffer.writeUInt16LE(deviceNum, 1);
    msgBuffer[3] = deviceType; // Slave: 0 = match any device type - Range 0 .. 127 if no pairing
    msgBuffer[4] = transmissionType; // Slave: 0 = match any transmission type

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_ID;
    this.name = "Set channel id";

    this.channel = channel;
    this.deviceNumber = deviceNum;
    this.deviceType = deviceType;
    this.transmissionType = transmissionType;
    this.pair = pairingRequest;

    this.setContent(msgBuffer);

    //console.log("SetChannelIDMessage", this);
}

SetChannelIDMessage.prototype = Object.create(ANTMessage.prototype);

SetChannelIDMessage.prototype.constructor = SetChannelIDMessage;

SetChannelIDMessage.prototype.PAIRING_BIT_MASK = parseInt("10000000", 2); // Bit 7 

SetChannelIDMessage.prototype.DEVICE_TYPE_ID_BIT_MASK = parseInt("01111111", 2); // Bit 0-6

SetChannelIDMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " deviceNumber " + this.deviceNumber + " deviceType" + this.deviceType + " transmissionType " + this.transmissionType;
};

module.exports = SetChannelIDMessage;