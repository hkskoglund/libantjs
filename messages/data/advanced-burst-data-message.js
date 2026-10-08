'use strict';

  var AcknowledgedDataMessage = require('./acknowledged-data-message'),
    Message = require('../message');

  function AdvancedBurstDataMessage(data) {
    Message.call(this, data, Message.prototype.ADVANCED_BURST_TRANSFER_DATA);
  }

  AdvancedBurstDataMessage.prototype = Object.create(AcknowledgedDataMessage.prototype);
  AdvancedBurstDataMessage.prototype.constructor = AdvancedBurstDataMessage;

  AdvancedBurstDataMessage.prototype.encode = function(channel, data) {
    AcknowledgedDataMessage.prototype.encodeData(this, channel, data);
    this.sequenceNr = (channel & 0xE0) >> 5;
  };

  AdvancedBurstDataMessage.prototype.decode = function(data) {
    if (this.content.byteLength < 2)
      throw new RangeError('Advanced ANT burst message must contain a channel and data');

    this.channel = data[Message.prototype.iChannel] & 0x1F;
    this.sequenceNr = (data[Message.prototype.iChannel] & 0xE0) >> 5;
    this.packet = data.subarray(Message.prototype.iPayload, Message.prototype.iPayload + this.length - 1);
  };

  module.exports = AdvancedBurstDataMessage;
  
