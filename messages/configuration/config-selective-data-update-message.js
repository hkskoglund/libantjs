'use strict';
import Message from '../message.js';

class ConfigSelectiveDataUpdateMessage extends Message {
  // maskNumber 0..31; includeAcknowledged also filters acknowledged data (default broadcast only)
  constructor(channel, maskNumber, includeAcknowledged) {
    super(undefined, Message.CONFIG_SELECTIVE_DATA_UPDATE);
    this.encode(channel, maskNumber, includeAcknowledged);
  }

  encode(channel, maskNumber, includeAcknowledged) {
    if (!Number.isInteger(maskNumber) || maskNumber < 0 || maskNumber > 0x1F)
      throw new RangeError('SDU mask number must be between 0 and 31');

    this.channel = channel;
    this.maskNumber = maskNumber;
    this.includeAcknowledged = Boolean(includeAcknowledged);
    this.setContent(Uint8Array.of(channel, maskNumber | (this.includeAcknowledged ? 0x80 : 0)));
  }

  // Selected data 0xFF removes the SDU mask from the channel
  static disable(channel) {
    const message = new ConfigSelectiveDataUpdateMessage(channel, 0);

    message.maskNumber = undefined;
    message.setContent(Uint8Array.of(channel, 0xFF));

    return message;
  }

  toString() {
    const description = this.maskNumber === undefined ? " disabled" :
      " mask " + this.maskNumber + (this.includeAcknowledged ? " broadcast and acknowledged" : " broadcast");

    return Message.prototype.toString.call(this) + " Ch " + this.channel + description;
  }
}

export default ConfigSelectiveDataUpdateMessage;
