/* global define: true, ArrayBuffer: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
var ANTMessage = require('messages/ANTMessage');


function SetLowPrioriyChannelSearchTimeoutMessage(channel, searchTimeout) {

    var msgBuffer = new ArrayBuffer(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = searchTimeout;

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT;
    this.name = "Set low priority search timeout";
    this.type = ANTMessage.prototype.TYPE.REQUEST;
    this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)

    this.setContent(msgBuffer);

    //console.log("setLowPrioriyChannelSearchTimeoutMessage", this);
}

SetLowPrioriyChannelSearchTimeoutMessage.prototype = Object.create(ANTMessage.prototype);

SetLowPrioriyChannelSearchTimeoutMessage.prototype.constructor = SetLowPrioriyChannelSearchTimeoutMessage;


SetLowPrioriyChannelSearchTimeoutMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16);
};

module.exports = SetLowPrioriyChannelSearchTimeoutMessage;
    return module.exports;
});