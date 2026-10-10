'use strict';

var Message = require('../message');

class SetChannelPeriodMessage extends Message {
  constructor(channel, messagePeriod) {

    super(undefined, Message.SET_CHANNEL_PERIOD);
    this.encode(channel, messagePeriod);
  }

  encode(channel, messagePeriod) {

    var   msgBuffer = new Uint8Array(3);

    msgBuffer[0] =  channel;
    msgBuffer[1] = messagePeriod & 0xFF;
    msgBuffer[2] = (messagePeriod & 0xFF00) >> 8;

    this.channel = channel;
    this.messagePeriod = messagePeriod;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this) + " Ch " + this.channel + " message period " + this.messagePeriod;
  }
}

module.exports = SetChannelPeriodMessage;

