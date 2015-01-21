/* global define: true, DataView: true, ArrayBuffer: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
var ANTMessage = require('messages/ANTMessage');


function SetChannelPeriodMessage(channel, messagePeriod) {

    var msgBuffer = new DataView(new ArrayBuffer(3));

    msgBuffer.setUint8(0,channel);
    msgBuffer.setUint16(1,messagePeriod, true);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_MESSAGING_PERIOD;
    this.name = "Set channel period";
    this.type = ANTMessage.prototype.TYPE.REQUEST;
    this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)

    this.channel = channel;
    this.messagePeriod = messagePeriod;

    this.setContent(msgBuffer.buffer);

    //console.log("SetChannelPeriodMessage", this);
}

SetChannelPeriodMessage.prototype = Object.create(ANTMessage.prototype);

SetChannelPeriodMessage.prototype.constructor = SetChannelPeriodMessage;


SetChannelPeriodMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " message period " + this.messagePeriod;
};

module.exports = SetChannelPeriodMessage;
    return module.exports;
});
