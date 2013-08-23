"use strict"

var ANTMessage = require('../ANTMessage.js');

function OpenChannelMessage(channel) {

    var msgBuffer = new Buffer([channel]);
  
    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.OPEN_CHANNEL;
    this.name = "Open channel";

    this.channel = channel;

    this.setContent(msgBuffer)

    //console.log("OpenChannelMessage", this);
}

OpenChannelMessage.prototype = Object.create(ANTMessage.prototype);

OpenChannelMessage.prototype.constructor = OpenChannelMessage;

OpenChannelMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16);
}

module.exports = OpenChannelMessage;