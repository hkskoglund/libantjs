"use strict"

var ANTMessage = require('./ANTMessage.js');


function SetChannelRFFreqMessage(channel, RFFreq) {

    var msgBuffer = new Buffer(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = RFFreq || 66;

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_RFFREQ;
    this.name = "Set channel RF frequency";

    this.setContent(msgBuffer)

    //console.log("SetChannelRFFreqMessage", this);
}

SetChannelRFFreqMessage.prototype = Object.create(ANTMessage.prototype);

SetChannelRFFreqMessage.prototype.constructor = SetChannelRFFreqMessage;


SetChannelRFFreqMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16);
}

module.exports = SetChannelRFFreqMessage;