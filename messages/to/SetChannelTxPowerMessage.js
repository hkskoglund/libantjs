"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

var ANTMessage = require('messages/ANTMessage');


function SetChannelTxPowerMessage(channel,transmitPower) {

    var msgBuffer = new ArrayBuffer(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = transmitPower; // Range 0..4

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_TX_POWER;
    this.name = "Set channel Tx power";

    this.setContent(msgBuffer);

    //console.log("SetChannelTxPowerMessage", this);
}

SetChannelTxPowerMessage.prototype = Object.create(ANTMessage.prototype);

SetChannelTxPowerMessage.prototype.constructor = SetChannelTxPowerMessage;


SetChannelTxPowerMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16);
};

module.exports = SetChannelTxPowerMessage;
    return module.exports;
});