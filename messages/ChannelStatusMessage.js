"use strict"
var ANTMessage = require('./ANTMessage.js'),
    Channel = require('../channel.js');


function ChannelStatusMessage() {

    //if (typeof data !== "undefined") {
    //    ANTMessage.call(this, data);
    //    this.parse();
    //} else
        ANTMessage.call(this);

    this.name = "Channel status";
    this.id = ANTMessage.prototype.MESSAGE.CHANNEL_STATUS;

    // console.log("Created ChannelStatusMessage", this);
}

ChannelStatusMessage.prototype = Object.create(ANTMessage.prototype);

ChannelStatusMessage.prototype.constructor = ChannelStatusMessage;

ChannelStatusMessage.prototype.STATE = {
    UN_ASSIGNED: 0x00,
    ASSIGNED: 0x01,
    SEARCHING: 0x02,
    TRACKING: 0x03
}

ChannelStatusMessage.prototype.parse = function () {
    var status;

    this.channelNumber = this.content[0];

    status = this.content[1];
    this.channelStatus = {
        value: status,
        state: status & parseInt("00000011", 2), // Lower 2 bits
        networkNumber: (status & parseInt("00001100", 2)) >> 2,
        channelType: (status & parseInt("11110000", 2)) >> 4
    };

    // Tip from http://www.i-programmer.info/programming/javascript/2550-javascript-bit-manipulation.html
    
    switch (this.channelStatus.state) {
        case ChannelStatusMessage.prototype.STATE.UN_ASSIGNED : this.channelStatus.stateMessage = "Un-Assigned"; break;
        case ChannelStatusMessage.prototype.STATE.ASSIGNED: this.channelStatus.stateMessage = "Assigned"; break;
        case ChannelStatusMessage.prototype.STATE.SEARCHING: this.channelStatus.stateMessage = "Searching"; break;
        case ChannelStatusMessage.prototype.STATE.TRACKING: this.channelStatus.stateMessage = "Tracking"; break;
        default: throw new Error('Unknown state for channel ' + this.channelStatus.state); break;
    }

    //console.log("Channel status", this.channelNumber, this.channelStatus);

    //this.message = { 'text': this.channelStatus.stateMessage };

    //return this.message;

};

ChannelStatusMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16) + " Channel " + this.channelNumber + " Network " + this.channelStatus.networkNumber + " " + Channel.prototype.TYPE[this.channelStatus.channelType] + " ";
}

module.exports = ChannelStatusMessage;