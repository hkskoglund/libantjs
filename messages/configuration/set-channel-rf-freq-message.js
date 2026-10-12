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

    return Message.prototype.toString.call(this) + ' Ch ' + this.channel +
      ' RF frequency ' + (SetChannelRFFreqMessage.BASE_FREQUENCY_MHZ + this.RFFreq) +
      ' MHz (offset ' + this.RFFreq + ')';
  }

  static BASE_FREQUENCY_MHZ = 2400;
}

export default SetChannelRFFreqMessage;
