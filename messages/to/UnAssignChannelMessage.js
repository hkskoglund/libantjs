"use strict"

var ANTMessage = require('../ANTMessage.js');


function UnAssignChannelMessage(channel) {

    var msgBuffer = new Buffer([channel]);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.UNASSIGN_CHANNEL;
    this.name = "UnAssign Channel";

    // Parameters

    this.channel = channel;

    this.setContent(msgBuffer)

    //console.log("UnAssignChannelMessage", this);

}

UnAssignChannelMessage.prototype = Object.create(ANTMessage.prototype);

UnAssignChannelMessage.prototype.constructor = UnAssignChannelMessage;

UnAssignChannelMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16) + " channel " + this.channel;
}

module.exports = UnAssignChannelMessage;