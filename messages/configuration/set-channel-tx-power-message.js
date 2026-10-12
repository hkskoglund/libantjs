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

    const power = SetChannelTxPowerMessage.POWER_LEVELS[this.transmitPower];
    return Message.prototype.toString.call(this) + ' Ch ' + this.channel +
      ' transmit power level ' + this.transmitPower +
      (power === undefined ? ' (unknown level)' : ' (' + power + ' dBm)');
  }

  static POWER_LEVELS = [-20, -10, -5, 0, 4];
}

export default SetChannelTxPowerMessage;
