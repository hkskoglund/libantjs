'use strict';

var Message = require('../message'),
  ChannelResponseEvent = require('../../channel/channel-response-event');

class ChannelResponseMessage extends Message {
  constructor(data) {

    super(data, Message.prototype.CHANNEL_RESPONSE);
  }

  decode() {

    if (this.content.byteLength !== 3)
      throw new RangeError('Channel response message must contain exactly 3 bytes');

    var initiatingId = this.content[1],
      code = this.content[2];

    this.response = new ChannelResponseEvent(this.channel, initiatingId, code);
  }

  isRFevent() {

    return this.response.isRFevent();
  }

  toString() {

    return Message.prototype.toString.call(this) + " " + this.response.toString();
  }
}

module.exports = ChannelResponseMessage;
