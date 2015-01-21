/* global define: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
var ANTMessage = require('messages/ANTMessage'),
    Channel = require('channel');


function ChannelStatusMessage(data) {

    //if (typeof data !== "undefined") {
    //    ANTMessage.call(this, data);
    //    this.parse();
    //} else
        ANTMessage.call(this,data);

    this.name = "Channel status";
    this.id = ANTMessage.prototype.MESSAGE.CHANNEL_STATUS;
    this.type = ANTMessage.prototype.TYPE.RESPONSE;
    this.requestId = ANTMessage.prototype.MESSAGE.REQUEST;
    
    if (data)
        this.parse();

    // console.log("Created ChannelStatusMessage", this);
}

ChannelStatusMessage.prototype = Object.create(ANTMessage.prototype);

ChannelStatusMessage.prototype.constructor = ChannelStatusMessage;

ChannelStatusMessage.prototype.STATE = {
    UN_ASSIGNED: 0x00,
    ASSIGNED: 0x01,
    SEARCHING: 0x02,
    TRACKING: 0x03
};

ChannelStatusMessage.prototype.parse = function () {
    var status = this.content[1];;

    this.channelNumber = this.content[0];

    this.channelStatus = {
        value: status,
        state: status & parseInt("00000011", 2), // Lower 2 bits
        networkNumber: (status & parseInt("00001100", 2)) >> 2,
        channelType: (status & parseInt("11110000", 2)) >> 4
    };

    // Tip from http://www.i-programmer.info/programming/javascript/2550-javascript-bit-manipulation.html
    
    switch (this.channelStatus.state) {
        case ChannelStatusMessage.prototype.STATE.UN_ASSIGNED : this.channelStatus.stateMessage = "UN-ASSIGNED"; break;
        case ChannelStatusMessage.prototype.STATE.ASSIGNED: this.channelStatus.stateMessage = "ASSIGNED"; break;
        case ChannelStatusMessage.prototype.STATE.SEARCHING: this.channelStatus.stateMessage = "SEARCHING"; break;
        case ChannelStatusMessage.prototype.STATE.TRACKING: this.channelStatus.stateMessage = "TRACKING"; break;
        default: throw new Error('Unknown state for channel ' + this.channelStatus.state); 
    }

    //console.log("Channel status", this.channelNumber, this.channelStatus);

    //this.message = { 'text': this.channelStatus.stateMessage };

    //return this.message;

};

ChannelStatusMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channelNumber + " N# " + this.channelStatus.networkNumber + " " + Channel.prototype.TYPE[this.channelStatus.channelType] + " " +
        this.channelStatus.stateMessage;
};

module.exports = ChannelStatusMessage;
    return module.exports;
});
