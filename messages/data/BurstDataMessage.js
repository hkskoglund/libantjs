/* global define: true, Uint8Array: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {
  'use strict';

  var AcknowledgedDataMessage = require('./AcknowledgedDataMessage'),
    Message = require('../Message');

  function BurstDataMessage(data) {
    Message.call(this, data, Message.prototype.BURST_TRANSFER_DATA);
  }

  BurstDataMessage.prototype = Object.create(AcknowledgedDataMessage.prototype);
  BurstDataMessage.prototype.constructor = BurstDataMessage;

  BurstDataMessage.prototype.decode = function(data) {
    this.channel = data[Message.prototype.iChannel] & 0x1F;
    this.sequenceNr = (data[Message.prototype.iChannel] & 0xE0) >> 5;
    this.packet = data.subarray(Message.prototype.iPayload, Message.prototype.iPayload + Message.prototype.PAYLOAD_LENGTH);
  };

  module.exports = BurstDataMessage;
  return module.exports;
});