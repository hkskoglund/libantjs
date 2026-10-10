'use strict';
import Message from '../message.js';

class SetChannelSearchSharingMessage extends Message {
  constructor(channel, searchSharingCycles) {
    super(undefined, Message.CHANNEL_SEARCH_SHARING);
    this.encode(channel, searchSharingCycles);
  }

  encode(channel, searchSharingCycles) {
    this.channel = channel;
    this.searchSharingCycles = searchSharingCycles;
    this.setContent(Uint8Array.of(channel, searchSharingCycles));
  }

  toString() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " search sharing cycles " + this.searchSharingCycles;
  }
}

export default SetChannelSearchSharingMessage;
