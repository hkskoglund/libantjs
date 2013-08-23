"use strict"

var ANTMessage = require('../ANTMessage.js');

// p.89 "ANT Message Protocol and Usage, rev 5.0b"
// "Valid messages include channel status, channel ID, ANT version, capabilities, event buffer, advanced burst capabilitites/configuration, event filter, and user NVM
function RequestMessage(channel, requestedMessageId, NVMaddr, NVMsize) {

    if (!requestedMessageId)
        throw new TypeError('no request message id. specified');

    var msgBuffer = new Buffer([channel || 0, requestedMessageId]);

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.REQUEST;
    this.name = "Request";

    this.channel = channel || 0;
    this.requestedMessageId = requestedMessageId;
    this.NVMaddr = NVMaddr;
    this.NVMsize = NVMsize;


    // Non Volatile Memory 
    if (typeof NVMaddr !== "undefined" && typeof NVMsize !== "undefined") {
        var NVM_Buffer;

        NVM_Buffer = new Buffer(3);
        NVM_Buffer.writeUInt16LE(NVMaddr);
        NVM_Buffer[2] = NVMsize;

        msgBuffer = Buffer.concat(msgBuffer, NVM_Buffer)

    } 
    
    this.setContent(msgBuffer)

    // console.log("RequestMessage", this);

}

RequestMessage.prototype = Object.create(ANTMessage.prototype);

RequestMessage.prototype.constructor = RequestMessage;

RequestMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " requested msg. id " + this.requestedMessageId + " NVMaddr " + this.NVMaddr + "NVMsize" + this.NVMsize;
}

module.exports = RequestMessage;