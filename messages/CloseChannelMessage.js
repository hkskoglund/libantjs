"use strict"

var ANTMessage = require('./ANTMessage.js');

function CloseChannelMessage(channel) {

    var msgBuffer = new Buffer([channel]);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.CLOSE_CHANNEL;
    this.name = "Close channel";

    this.setContent(msgBuffer)

    //console.log("CloseChannelMessage", this);
}

CloseChannelMessage.prototype = Object.create(ANTMessage.prototype);

CloseChannelMessage.prototype.constructor = CloseChannelMessage;

CloseChannelMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16);
}

module.exports = CloseChannelMessage;