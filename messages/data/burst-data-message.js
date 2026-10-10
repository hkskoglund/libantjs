'use strict';
import AcknowledgedDataMessage from './acknowledged-data-message.js';
import Message from '../message.js';



class BurstDataMessage extends AcknowledgedDataMessage {
  constructor(data) {

    super(data, Message.BURST_TRANSFER_DATA);
  }

  encode(channel, data) {

    AcknowledgedDataMessage.prototype.encode.call(this,channel,data);
    this.sequenceNr = (channel & 0xE0) >> 5;
  }

  decode(data) {

    if (this.content.byteLength !== Message.PAYLOAD_LENGTH + 1)
      throw new RangeError('Standard ANT burst message must contain a channel and 8 data bytes');

    this.channel = data[Message.iChannel] & 0x1F;
    this.sequenceNr = (data[Message.iChannel] & 0xE0) >> 5;
    this.packet = data.subarray(Message.iPayload, Message.iPayload + Message.PAYLOAD_LENGTH);
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

export default BurstDataMessage;

