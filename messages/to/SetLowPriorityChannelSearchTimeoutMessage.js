"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

var ANTMessage = require('../ANTMessage.js');


function setLowPrioriyChannelSearchTimeoutMessage(channel, searchTimeout) {

    var msgBuffer = new ArrayBuffer(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = searchTimeout;

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT;
    this.name = "Set low priority search timeout";

    this.setContent(msgBuffer);

    //console.log("setLowPrioriyChannelSearchTimeoutMessage", this);
}

setLowPrioriyChannelSearchTimeoutMessage.prototype = Object.create(ANTMessage.prototype);

setLowPrioriyChannelSearchTimeoutMessage.prototype.constructor = setLowPrioriyChannelSearchTimeoutMessage;


setLowPrioriyChannelSearchTimeoutMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16);
};

module.exports = setLowPrioriyChannelSearchTimeoutMessage;
    return module.exports;
});