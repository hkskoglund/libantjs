'use strict';

var AcknowledgedDataMessage = require('./acknowledged-data-message'),
  Message = require('../message');

class BurstDataMessage extends AcknowledgedDataMessage {
  constructor(data) {

    super(data, Message.prototype.BURST_TRANSFER_DATA);
  }

  encode(channel, data) {

    AcknowledgedDataMessage.prototype.encode.call(this,channel,data);
    this.sequenceNr = (channel & 0xE0) >> 5;
  }

  decode(data) {

    if (this.content.byteLength !== Message.prototype.PAYLOAD_LENGTH + 1)
      throw new RangeError('Standard ANT burst message must contain a channel and 8 data bytes');

    this.channel = data[Message.prototype.iChannel] & 0x1F;
    this.sequenceNr = (data[Message.prototype.iChannel] & 0xE0) >> 5;
    this.packet = data.subarray(Message.prototype.iPayload, Message.prototype.iPayload + Message.prototype.PAYLOAD_LENGTH);
  }

  toString() {

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
  }
}

module.exports = BurstDataMessage;

