/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */
  'use strict';

  var AcknowledgedDataMessage = require('./AcknowledgedDataMessage'),
    Message = require('../Message');

  function AdvancedBurstDataMessage(data) {
    Message.call(this, data, Message.prototype.ADVANCED_BURST_TRANSFER_DATA);
  }

  AdvancedBurstDataMessage.prototype = Object.create(AcknowledgedDataMessage.prototype);
  AdvancedBurstDataMessage.prototype.constructor = AdvancedBurstDataMessage;

  AdvancedBurstDataMessage.prototype.decode = function(data) {
    this.channel = data[Message.prototype.iChannel] & 0x1F;
    this.sequenceNr = (data[Message.prototype.iChannel] & 0xE0) >> 5;
    this.packet = data.subarray(Message.prototype.iPayload, Message.prototype.iPayload + this.length - 1);
  };

  module.exports = AdvancedBurstDataMessage;
  return module.exports;
