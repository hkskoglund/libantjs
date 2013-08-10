"use strict"
var ANTMessage = require('./ANTMessage.js');

function ResetSystemMessage() {

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.RESET_SYSTEM;
    this.name = "Reset System";
    
    this.create(ANTMessage.prototype.FILLER_BYTE);

}

ResetSystemMessage.prototype = Object.create(ANTMessage.prototype);

ResetSystemMessage.prototype.constructor = ResetSystemMessage;

module.exports = ResetSystemMessage;