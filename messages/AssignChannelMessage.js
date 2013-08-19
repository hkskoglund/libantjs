"use strict"

var ANTMessage = require('./ANTMessage.js');


function AssignChannelMessage(channel,channelType,networkNumber,extendedAssignment) {
    
    var msgBuffer = new Buffer([channel, channelType, networkNumber]);

    if (extendedAssignment)
       msgBuffer =  Buffer.concat([msgBuffer,new Buffer([extendedAssignment])]);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.ASSIGN_CHANNEL;
    this.name = "Assign Channel";
    this.channel = channel;

    this.setContent(msgBuffer)

    //console.log("AssignChannelMessage", this);

}

AssignChannelMessage.prototype = Object.create(ANTMessage.prototype);

AssignChannelMessage.prototype.constructor = AssignChannelMessage;

AssignChannelMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16) + this.message;
}

module.exports = AssignChannelMessage;