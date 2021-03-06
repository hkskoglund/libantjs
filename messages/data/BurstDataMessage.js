/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */
  /*jshint -W097 */
'use strict';

  var AcknowledgedDataMessage = require('./AcknowledgedDataMessage'),
    Message = require('../Message');

  function BurstDataMessage(data) {
    Message.call(this, data, Message.prototype.BURST_TRANSFER_DATA);
  }

  BurstDataMessage.prototype = Object.create(AcknowledgedDataMessage.prototype);
  BurstDataMessage.prototype.constructor = BurstDataMessage;

  BurstDataMessage.prototype.encode = function (channel,data)
  {
    AcknowledgedDataMessage.prototype.encode.call(this,channel,data);
    this.sequenceNr = (channel & 0xE0) >> 5;
  };

  BurstDataMessage.prototype.decode = function(data) {
    this.channel = data[Message.prototype.iChannel] & 0x1F;
    this.sequenceNr = (data[Message.prototype.iChannel] & 0xE0) >> 5;
    this.packet = data.subarray(Message.prototype.iPayload, Message.prototype.iPayload + Message.prototype.PAYLOAD_LENGTH);
  };

  BurstDataMessage.prototype.toString = function() {
    var sequence = '';

    if (this.sequenceNr === 0)
    {
      sequence = 'FIRST';
    } else if (this.sequenceNr & 0x4)
    {
      sequence = 'LAST';
    }

    return AcknowledgedDataMessage.prototype.toString.call(this) + ' CH ' + (this.channel & 0x1F) +
            ' Sequence ' + this.sequenceNr + ' ' + sequence;
  };

  module.exports = BurstDataMessage;
  
