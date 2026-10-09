'use strict';

var Message = require('../message');

class SetChannelSearchTimeoutMessage extends Message {
  constructor(channel, searchTimeout) {

    super(undefined, Message.prototype.SET_CHANNEL_SEARCH_TIMEOUT);
    this.encode(channel, searchTimeout);
  }

  encode(channel, searchTimeout) {

    var msgBuffer = new Uint8Array(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = searchTimeout;

    this.setContent(msgBuffer);

    this.channel = channel;
    this.highPrioritySearchTimeout = searchTimeout;
  }

  toString() {

    return Message.prototype.toString.call(this) + "Ch " + this.channel + " high priority search timeout" + this.highPrioritySearchTimeout;
  }
}

module.exports = SetChannelSearchTimeoutMessage;

