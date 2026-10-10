'use strict';
import Message from '../message.js';

class SduMaskMessage extends Message {
  constructor(data) {
    super(data);
  }

  decode() {
    this.maskNumber = this.content[0];
    this.mask = this.content.subarray(1, 1 + Message.PAYLOAD_LENGTH);
  }

  toString() {
    return Message.prototype.toString.call(this) + " mask " + this.maskNumber + " " + Array.from(this.mask);
  }
}

export default SduMaskMessage;
