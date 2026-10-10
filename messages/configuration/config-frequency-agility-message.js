'use strict';
import Message from '../message.js';

class ConfigFrequencyAgilityMessage extends Message {
  constructor(channel, frequency1, frequency2, frequency3) {
    super(undefined, Message.FREQUENCY_AGILITY);
    this.encode(channel, frequency1, frequency2, frequency3);
  }

  encode(channel, frequency1, frequency2, frequency3) {
    this.channel = channel;
    this.frequencies = [frequency1, frequency2, frequency3];
    this.setContent(Uint8Array.of(channel, frequency1, frequency2, frequency3));
  }

  toString() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " frequencies " + this.frequencies;
  }
}

export default ConfigFrequencyAgilityMessage;
