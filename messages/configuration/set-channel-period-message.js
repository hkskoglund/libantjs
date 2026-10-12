'use strict';
import Message from '../message.js';



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

    const periodSeconds = this.messagePeriod / SetChannelPeriodMessage.CLOCK_RATE;
    const frequencyHz = SetChannelPeriodMessage.CLOCK_RATE / this.messagePeriod;
    const frequency = Number(frequencyHz.toFixed(3));

    return Message.prototype.toString.call(this) + ' Ch ' + this.channel +
      ' message period ' + this.messagePeriod + ' ticks (' + periodSeconds.toFixed(3) +
      ' s, ' + frequency + ' Hz)';
  }

  static CLOCK_RATE = 32768;
}

export default SetChannelPeriodMessage;
