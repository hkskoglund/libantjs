"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

var ANTMessage = require('../ANTMessage.js');


function SetChannelSearchTimeoutMessage(channel, searchTimeout) {

    var msgBuffer = new ArrayBuffer(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = searchTimeout;

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_SEARCH_TIMEOUT;
    this.name = "Set channel search timeout";

    this.channel = channel;
    this.HPsearchTimeout = searchTimeout;

    this.setContent(msgBuffer);

    //console.log("SetChannelSearchTimeoutMessage", this);
}

SetChannelSearchTimeoutMessage.prototype = Object.create(ANTMessage.prototype);

SetChannelSearchTimeoutMessage.prototype.constructor = SetChannelSearchTimeoutMessage;


SetChannelSearchTimeoutMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16)+ "channel "+this.channel+" HP search timeout" +this.HPsearchTimeout;
};

module.exports = SetChannelSearchTimeoutMessage;
    return module.exports;
});