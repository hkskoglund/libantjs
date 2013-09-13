"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
var ANTMessage = require('../ANTMessage.js');

function ResetSystemMessage() {

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.RESET_SYSTEM;
    this.name = "Reset System";
    
    this.setContent(ANTMessage.prototype.FILLER_BYTE_BUFFER);
    //this.create();
    //this.create(new Buffer([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    // Seems like 24 bytes is tolerable, but 25 bytes gives notification "serial error" : message too large
    // So ANT chip has space for a message of 24 bytes -> 2 "packets" of 12 bytes
    
}

ResetSystemMessage.prototype = Object.create(ANTMessage.prototype);

ResetSystemMessage.prototype.constructor = ResetSystemMessage;

module.exports = ResetSystemMessage;
    return module.exports;
});