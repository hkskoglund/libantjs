"use strict"
var ANTMessage = require('./ANTMessage.js');

function ResetSystemMessage() {

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.RESET_SYSTEM;
    this.name = "Reset System";
    
    this.create(ANTMessage.prototype.FILLER_BYTE);
    //this.create(new Buffer([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    // Seems like 24 bytes is tolerable, but 25 bytes gives notification "serial error" : message too large
    // So ANT chip has space for a message of 24 bytes -> 2 "packets" of 12 bytes
    
}

ResetSystemMessage.prototype = Object.create(ANTMessage.prototype);

ResetSystemMessage.prototype.constructor = ResetSystemMessage;

module.exports = ResetSystemMessage;