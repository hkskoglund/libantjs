"use strict"

var ANTMessage = require('../ANTMessage.js');


function SetNetworkKeyMessage(channel, key) {

    if (key.length !== 8)
        throw new TypeError("Key does not have length of 8 bytes");

    var msgBuffer = new Buffer(9);

    // Be flexible, try to create a buffer if an array is used
    if (Buffer.isBuffer(key))
      msgBuffer = Buffer.concat([new Buffer([channel]), key]);
    else
        msgBuffer = Buffer.concat([new Buffer([channel]), new Buffer(key)]);

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
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " key " + this.key;
}

module.exports = SetNetworkKeyMessage;