'use strict';
import Message from '../message.js';



class SetChannelRFFreqMessage extends Message {
  constructor(channel, RFFreq) {

    super(undefined, Message.SET_CHANNEL_RFFREQ);

    this.encode(channel, RFFreq);
  }

  encode(channel, RFFreq) {

    var msgBuffer = new Uint8Array(2);

    if (typeof RFFreq === 'undefined')
      RFFreq = 66;

    msgBuffer[0] = channel;
    msgBuffer[1] = RFFreq;

    this.channel = channel;
    this.RFFreq = RFFreq;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this) + " Ch " + this.channel + " RF freq. " + this.RFFreq;
  }
}

export default SetChannelRFFreqMessage;

