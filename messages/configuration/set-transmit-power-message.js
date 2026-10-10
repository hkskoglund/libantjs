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

    return Message.prototype.toString.call(this) + ' transmit power ' + this.transmitPower;
  }
}

export default SetTransmitPowerMessage;

