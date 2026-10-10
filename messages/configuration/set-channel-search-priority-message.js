'use strict';
import Message from '../message.js';

class SetChannelSearchPriorityMessage extends Message {
  constructor(channel, searchPriority) {
    super(undefined, Message.SET_CHANNEL_SEARCH_PRIORITY);
    this.encode(channel, searchPriority);
  }

  encode(channel, searchPriority) {
    this.channel = channel;
    this.searchPriority = searchPriority;
    this.setContent(Uint8Array.of(channel, searchPriority));
  }

  toString() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " search priority " + this.searchPriority;
  }
}

export default SetChannelSearchPriorityMessage;
