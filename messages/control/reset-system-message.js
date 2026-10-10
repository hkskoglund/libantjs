'use strict';
import Message from '../message.js';



class ResetSystemMessage extends Message {
  constructor() {

    super(undefined, Message.RESET_SYSTEM);

    this.encode();
  }

  encode() {

    this.setContent(new Uint8Array(1));
  }
}

export default ResetSystemMessage;

