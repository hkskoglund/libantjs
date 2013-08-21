"use strict"

var ANTMessage = require('../ANTMessage.js');


function SetNetworkKeyMessage(channel, key) {

    var msgBuffer = new Buffer(9);

    msgBuffer = Buffer.concat([new Buffer([channel]), key]);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_NETWORK_KEY;
    this.name = "Set network key";

    this.channel = channel;
    this.key = key;

    this.setContent(msgBuffer)

    //console.log("SetNetworkKeyMessage", this);
}

SetNetworkKeyMessage.prototype = Object.create(ANTMessage.prototype);

SetNetworkKeyMessage.prototype.constructor = SetNetworkKeyMessage;


SetNetworkKeyMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16) + " channel " + this.channel + " key " + this.key;
}

module.exports = SetNetworkKeyMessage;