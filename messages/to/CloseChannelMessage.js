/* global define: true, Uint8Array: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
var ANTMessage = require('messages/ANTMessage');

function CloseChannelMessage(channel) {

    var msgBuffer = new Uint8Array([channel]);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.CLOSE_CHANNEL;
    this.name = "Close channel";

    this.setContent(msgBuffer.buffer);

    //console.log("CloseChannelMessage", this);
}

CloseChannelMessage.prototype = Object.create(ANTMessage.prototype);

CloseChannelMessage.prototype.constructor = CloseChannelMessage;

CloseChannelMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16);
};

module.exports = CloseChannelMessage;
    return module.exports;
});