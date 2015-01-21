/* global define: true, Uint8Array */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
var ANTMessage = require('messages/ANTMessage'),
    Channel = require('channel');


function AssignChannelMessage(channel,channelType,networkNumber,extendedAssignment) {
    //console.log("Assign channel msg args", arguments);

    var msgBuffer;
    
    if (extendedAssignment)
        msgBuffer = new Uint8Array([channel,channelType,networkNumber,extendedAssignment]);
    else
        msgBuffer = new Uint8Array([channel, channelType, networkNumber]);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.ASSIGN_CHANNEL;
    this.name = "Assign Channel";
    this.type = ANTMessage.prototype.TYPE.REQUEST;
    this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)

    this.channel = channel;
    this.channelType = channelType;
    this.networkNumber = networkNumber;
    if (extendedAssignment)
      this.extendedAssignment = extendedAssignment;

    this.setContent(msgBuffer.buffer);

    //console.log("AssignChannelMessage", this);

}

AssignChannelMessage.prototype = Object.create(ANTMessage.prototype);

AssignChannelMessage.prototype.constructor = AssignChannelMessage;

AssignChannelMessage.prototype.toString = function () {
    var msg = this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " N# " + this.networkNumber + " " + Channel.prototype.TYPE[this.channelType];
    if (this.extendedAssignment)
        msg += " extended assignment " + this.extendedAssignment;
    return msg;
};

module.exports = AssignChannelMessage;
return module.exports;
});
