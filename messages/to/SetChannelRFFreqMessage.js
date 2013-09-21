"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

var ANTMessage = require('messages/ANTMessage');


function SetChannelRFFreqMessage(channel, RFFreq) {

    var msgBuffer = new ArrayBuffer(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = RFFreq || 66;

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_RFFREQ;
    this.name = "Set channel RF frequency";

    this.channel = channel;
    this.RFFreq = RFFreq;

    this.setContent(msgBuffer);

    //console.log("SetChannelRFFreqMessage", this);
}

SetChannelRFFreqMessage.prototype = Object.create(ANTMessage.prototype);

SetChannelRFFreqMessage.prototype.constructor = SetChannelRFFreqMessage;


SetChannelRFFreqMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " RF freq. " + this.RFFreq;
};

module.exports = SetChannelRFFreqMessage;
    return module.exports;
});