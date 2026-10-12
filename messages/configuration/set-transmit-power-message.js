'use strict';
import Message from '../message.js';



class SetTransmitPowerMessage extends Message {
  constructor(transmitPower) {

    super(undefined, Message.SET_TRANSMIT_POWER);
    this.encode(transmitPower);
  }

  encode(transmitPower) {

    var msgBuffer = new Uint8Array([Message.FILLER_BYTE, transmitPower]);

    this.transmitPower = transmitPower;

    this.setContent(msgBuffer);
  }

  toString() {

    const power = SetTransmitPowerMessage.POWER_LEVELS[this.transmitPower];
    return Message.prototype.toString.call(this) + ' transmit power level ' + this.transmitPower +
      (power === undefined ? ' (unknown level)' : ' (' + power + ' dBm)');
  }

  static POWER_LEVELS = [-20, -10, -5, 0, 4];
}

export default SetTransmitPowerMessage;
