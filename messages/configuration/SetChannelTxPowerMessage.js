/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  'use strict';

  var Message = require('../Message');

  function SetChannelTxPowerMessage(channel, transmitPower) {

    Message.call(this, undefined, Message.prototype.SET_CHANNEL_TX_POWER);
    this.encode(channel, transmitPower);

  }

  SetChannelTxPowerMessage.prototype = Object.create(Message.prototype);

  SetChannelTxPowerMessage.prototype.constructor = SetChannelTxPowerMessage;

  SetChannelTxPowerMessage.prototype.encode = function(channel, transmitPower) {
    var msgBuffer = new Uint8Array(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = transmitPower; // Range 0..4

    this.channel = channel;
    this.transmitPower = transmitPower;

    this.setContent(msgBuffer);

  };

  SetChannelTxPowerMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + ' Ch ' + this.channel + ' transmit power ' + this.transmitPower;
  };

  module.exports = SetChannelTxPowerMessage;
  return module.exports;
