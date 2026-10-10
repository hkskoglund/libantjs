'use strict';
import AcknowledgedDataMessage from './acknowledged-data-message.js';
import Message from '../message.js';



class AdvancedBurstDataMessage extends AcknowledgedDataMessage {
  constructor(data) {

    super(data, Message.ADVANCED_BURST_TRANSFER_DATA);
  }

  encode(channel, data) {

    AcknowledgedDataMessage.prototype.encodeData(this, channel, data);
    this.sequenceNr = (channel & 0xE0) >> 5;
  }

  decode(data) {

    if (this.content.byteLength < 2)
      throw new RangeError('Advanced ANT burst message must contain a channel and data');

    this.channel = data[Message.iChannel] & 0x1F;
    this.sequenceNr = (data[Message.iChannel] & 0xE0) >> 5;
    this.packet = data.subarray(Message.iPayload, Message.iPayload + this.length - 1);
  }
}

export default AdvancedBurstDataMessage;

