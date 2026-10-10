'use strict';
import Message from '../message.js';

class EnableCrystalMessage extends Message {
  constructor() {
    super(undefined, Message.ENABLE_CRYSTAL);
    this.encode();
  }

  encode() {
    this.setContent(Uint8Array.of(Message.FILLER_BYTE));
  }

  toString() {
    return Message.prototype.toString.call(this);
  }
}

export default EnableCrystalMessage;
