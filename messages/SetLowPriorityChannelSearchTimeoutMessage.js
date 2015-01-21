/* global define: true, Uint8Array: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
var ANTMessage = require('messages/ANTMessage');
    //LowPrioritySearchTimeout = require('messages/LowPrioritySearchTimeout');


function SetLowPrioriyChannelSearchTimeoutMessage(channel, searchTimeout) {

    var msgBuffer = new Uint8Array(2);

    msgBuffer[0] = channel;
    
    if (typeof searchTimeout !== 'number')
          msgBuffer[1] = searchTimeout.getRawValue();
        else
            msgBuffer[1] = searchTimeout;

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT;
    this.name = "Set low priority search timeout";
    this.type = ANTMessage.prototype.TYPE.REQUEST;
    this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)

    this.setContent(msgBuffer.buffer);
    
    this.LPsearchTimeout = searchTimeout;

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
