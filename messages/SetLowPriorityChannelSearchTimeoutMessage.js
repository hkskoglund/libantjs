"use strict"

var ANTMessage = require('./ANTMessage.js');


function setLowPrioriyChannelSearchTimeoutMessage(channel, searchTimeout) {

    var msgBuffer = new Buffer(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = searchTimeout;

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT;
    this.name = "Set low priority search timeout";

    this.setContent(msgBuffer)

    //console.log("setLowPrioriyChannelSearchTimeoutMessage", this);
}

setLowPrioriyChannelSearchTimeoutMessage.prototype = Object.create(ANTMessage.prototype);

setLowPrioriyChannelSearchTimeoutMessage.prototype.constructor = setLowPrioriyChannelSearchTimeoutMessage;


setLowPrioriyChannelSearchTimeoutMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16);
}

module.exports = setLowPrioriyChannelSearchTimeoutMessage;