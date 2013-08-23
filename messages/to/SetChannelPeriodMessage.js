"use strict"

var ANTMessage = require('../ANTMessage.js');


function SetChannelPeriodMessage(channel, messagePeriod) {

    var msgBuffer = new Buffer(3);

    msgBuffer[0] = channel;
    msgBuffer.writeUInt16LE(messagePeriod, 1);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_MESSAGING_PERIOD;
    this.name = "Set channel period";

    this.channel = channel;
    this.messagePeriod = messagePeriod;

    this.setContent(msgBuffer)

    //console.log("SetChannelPeriodMessage", this);
}

SetChannelPeriodMessage.prototype = Object.create(ANTMessage.prototype);

SetChannelPeriodMessage.prototype.constructor = SetChannelPeriodMessage;


SetChannelPeriodMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " message period " + this.messagePeriod;
}

module.exports = SetChannelPeriodMessage;