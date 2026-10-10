'use strict';
import Message from '../message.js';



class UnAssignChannelMessage extends Message {
  constructor(channel) {

    super(undefined, Message.UNASSIGN_CHANNEL);
    this.encode(channel);
  }

  encode(channel) {

    var msgBuffer = new Uint8Array([channel]);

    this.channel = channel;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this) + " Ch " + this.channel;
  }
}

export default UnAssignChannelMessage;

