'use strict';

var Message = require('../message');

class OpenChannelMessage extends Message {
  constructor(channel) {

    super(undefined, Message.prototype.OPEN_CHANNEL);
    this.encode(channel);
  }

  encode(channel) {

    this.setContent(new Uint8Array([channel]));
  }

  toString() {

    return Message.prototype.toString.call(this);
  }
}

module.exports = OpenChannelMessage;

