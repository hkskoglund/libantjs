/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    'use strict';

    var Message = require('./Message');

    function SetChannelTxPowerMessage(channel,transmitPower) {

        var msgBuffer = new Uint8Array(2);

        msgBuffer[0] = channel;
        msgBuffer[1] = transmitPower; // Range 0..4

        Message.call(this,undefined,Message.prototype.SET_CHANNEL_TX_POWER);

        this.setContent(msgBuffer.buffer);

    }

    SetChannelTxPowerMessage.prototype = Object.create(Message.prototype);

    SetChannelTxPowerMessage.prototype.constructor = SetChannelTxPowerMessage;


    SetChannelTxPowerMessage.prototype.toString = function () {
        return Message.prototype.toString();
    };

    module.exports = SetChannelTxPowerMessage;
    return module.exports;
});
