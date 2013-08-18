﻿"use strict"

var ANTMessage = require('./ANTMessage.js');


function SetChannelSearchTimeoutMessage(channel, searchTimeout) {

    var msgBuffer = new Buffer(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = searchTimeout;

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_SEARCH_TIMEOUT;
    this.name = "Set channel search timeout";

    this.setContent(msgBuffer)

    //console.log("SetChannelSearchTimeoutMessage", this);
}

SetChannelSearchTimeoutMessage.prototype = Object.create(ANTMessage.prototype);

SetChannelSearchTimeoutMessage.prototype.constructor = SetChannelSearchTimeoutMessage;


SetChannelSearchTimeoutMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16);
}

module.exports = SetChannelSearchTimeoutMessage;