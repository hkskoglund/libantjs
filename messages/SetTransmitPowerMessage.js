/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    'use strict';

    var Message = require('./Message');

    function SetTransmitPowerMessage(transmitPower) {

        var msgBuffer = new Uint8Array(2);

        msgBuffer[0] = 0x00; // Filler
        msgBuffer[1] = transmitPower; // Range 0..4

        Message.call(this,undefined,Message.prototype.MESSAGE.SET_TRANSMIT_POWER);

        this.setContent(msgBuffer.buffer);

    }

    SetTransmitPowerMessage.prototype = Object.create(Message.prototype);

    SetTransmitPowerMessage.prototype.constructor = SetTransmitPowerMessage;


    SetTransmitPowerMessage.prototype.toString = function () {
        return Message.prototype.toString();
    };

    module.exports = SetTransmitPowerMessage;
    return module.exports;
});
