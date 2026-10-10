'use strict';
import Message from '../message.js';



class SleepMessage extends Message {
  constructor() {

    super(undefined, Message.SLEEP_MESSAGE);
    this.encode();
  }

  encode() {

    this.setContent(new Uint8Array([0]));
  }
}

export default SleepMessage;
