/* global define: true, Uint8Array: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
var ANTMessage = require('messages/ANTMessage');


function SetTransmitPowerMessage(transmitPower) {

    var msgBuffer = new Uint8Array(2);

    msgBuffer[0] = 0x00; // Filler
    msgBuffer[1] = transmitPower; // Range 0..4

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_TRANSMIT_POWER;
    this.name = "Set transmit power";

    this.setContent(msgBuffer.buffer);

    //console.log("SetTransmitPowerMessage", this);
}

SetTransmitPowerMessage.prototype = Object.create(ANTMessage.prototype);

SetTransmitPowerMessage.prototype.constructor = SetTransmitPowerMessage;


SetTransmitPowerMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16);
};

module.exports = SetTransmitPowerMessage;
    return module.exports;
});
