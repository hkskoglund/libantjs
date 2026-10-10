'use strict';

var Message = require('../message');

class CloseChannelMessage extends Message {
  constructor(channel) {

    super(undefined, Message.CLOSE_CHANNEL);
    this.encode(channel);
  }

  encode(channel) {

    this.setContent(new Uint8Array([channel]));
  }

  toString() {

    return Message.prototype.toString.call(this);
  }
}

module.exports = CloseChannelMessage;

