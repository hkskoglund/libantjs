/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message');

  function SetTransmitPowerMessage(transmitPower) {

    Message.call(this, undefined, Message.prototype.SET_TRANSMIT_POWER);
    this.encode(transmitPower);

  }

  SetTransmitPowerMessage.prototype = Object.create(Message.prototype);

  SetTransmitPowerMessage.prototype.constructor = SetTransmitPowerMessage;

  SetTransmitPowerMessage.prototype.encode = function(transmitPower) {
    var msgBuffer = new Uint8Array([Message.prototype.FILLER_BYTE, transmitPower]);

    this.transmitPower = transmitPower;

    this.setContent(msgBuffer);

  };

  SetTransmitPowerMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + ' transmit power ' + this.transmitPower;
  };

  module.exports = SetTransmitPowerMessage;
  return module.exports;
