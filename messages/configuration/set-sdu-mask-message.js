'use strict';
import Message from '../message.js';

class SetSduMaskMessage extends Message {
  // mask is 8 bytes; a set bit means "compare and send an update when this bit changes"
  constructor(maskNumber, mask) {
    super(undefined, Message.SET_SDU_MASK);
    this.encode(maskNumber, mask);
  }

  encode(maskNumber, mask) {
    if (!mask || mask.length !== Message.PAYLOAD_LENGTH)
      throw new RangeError('SDU mask must be 8 bytes');

    const content = new Uint8Array(1 + Message.PAYLOAD_LENGTH);

    content[0] = maskNumber;
    content.set(mask, 1);

    this.maskNumber = maskNumber;
    this.mask = mask;
    this.setContent(content);
  }

  toString() {
    return Message.prototype.toString.call(this) + " mask " + this.maskNumber + " " + Array.from(this.mask);
  }
}

export default SetSduMaskMessage;
