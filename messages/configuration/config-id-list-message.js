'use strict';
import Message from '../message.js';

class ConfigIdListMessage extends Message {
  constructor(channel, listSize, exclude) {
    super(undefined, Message.CONFIG_ID_LIST);
    this.encode(channel, listSize, exclude);
  }

  encode(channel, listSize, exclude) {
    this.channel = channel;
    this.listSize = listSize;
    this.exclude = exclude ? 1 : 0;
    this.setContent(Uint8Array.of(channel, listSize, this.exclude));
  }

  toString() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " size " + this.listSize + (this.exclude ? " exclude" : " include");
  }
}

export default ConfigIdListMessage;
