'use strict';
import Message from '../message.js';



class SetChannelTxPowerMessage extends Message {
  constructor(channel, transmitPower) {

    super(undefined, Message.SET_CHANNEL_TX_POWER);
    this.encode(channel, transmitPower);
  }

  encode(channel, transmitPower) {

    var msgBuffer = new Uint8Array(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = transmitPower; // Range 0..4

    this.channel = channel;
    this.transmitPower = transmitPower;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this) + ' Ch ' + this.channel + ' transmit power ' + this.transmitPower;
  }
}

export default SetChannelTxPowerMessage;

