'use strict';
import Message from '../message.js';

class EnableLedMessage extends Message {
  constructor(enable) {
    super(undefined, Message.ENABLE_LED);
    this.encode(enable);
  }

  encode(enable) {
    this.enable = enable ? 1 : 0;
    this.setContent(Uint8Array.of(Message.FILLER_BYTE, this.enable));
  }

  toString() {
    return Message.prototype.toString.call(this) + " enable " + this.enable;
  }
}

export default EnableLedMessage;
