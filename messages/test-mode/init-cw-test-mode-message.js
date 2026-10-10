'use strict';
import Message from '../message.js';

class InitCwTestModeMessage extends Message {
  constructor() {
    super(undefined, Message.INIT_CW_TEST_MODE);
    this.encode();
  }

  encode() {
    this.setContent(Uint8Array.of(Message.FILLER_BYTE));
  }

  toString() {
    return Message.prototype.toString.call(this);
  }
}

export default InitCwTestModeMessage;
