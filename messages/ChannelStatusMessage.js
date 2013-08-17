"use strict"
var ANTMessage = require('./ANTMessage.js');


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

ChannelStatusMessage.prototype.parse = function () {

    var statusMessage = this.content[0];

    // Tip from http://www.i-programmer.info/programming/javascript/2550-javascript-bit-manipulation.html
    this.state = statusMessage &       parseInt("00000011",2); // Lower 2 bits
    this.networkNr = (statusMessage & parseInt("00001100", 2)) >> 2;
    this.channelType = (statusMessage & parseInt("11110000", 2)) >> 4
    
    switch (this.state) {
        case 0: this.stateMessage = "Un-Assigned"; break;
        case 1: this.stateMessage = "Assigned"; break;
        case 2: this.stateMessage = "Searching"; break;
        case 3: this.stateMessage = "Tracking"; break;
        default: throw new Error('Unknown state for channel ' + this.state); break;
    }


    this.message = { 'text': this.stateMessage };

    return this.message;

};

ChannelStatusMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16) + " " + this.message.text;
}

module.exports = ChannelStatusMessage;