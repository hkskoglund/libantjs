/* global define: true, Uint8Array: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
var ANTMessage = require('messages/ANTMessage');


function UnAssignChannelMessage(channel) {

    var msgBuffer = new Uint8Array([channel]);
    

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.UNASSIGN_CHANNEL;
    this.name = "UnAssign Channel";

    // Parameters

    this.channel = channel;

    this.setContent(msgBuffer.buffer);

    //console.log("UnAssignChannelMessage", this);

}

UnAssignChannelMessage.prototype = Object.create(ANTMessage.prototype);

UnAssignChannelMessage.prototype.constructor = UnAssignChannelMessage;

UnAssignChannelMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel;
};

module.exports = UnAssignChannelMessage;
    return module.exports;
});
