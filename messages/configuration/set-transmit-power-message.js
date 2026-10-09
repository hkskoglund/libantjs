'use strict';

var Message = require('../message');

class SetTransmitPowerMessage extends Message {
  constructor(transmitPower) {

    super(undefined, Message.prototype.SET_TRANSMIT_POWER);
    this.encode(transmitPower);
  }

  encode(transmitPower) {

    var msgBuffer = new Uint8Array([Message.prototype.FILLER_BYTE, transmitPower]);

    this.transmitPower = transmitPower;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this) + ' transmit power ' + this.transmitPower;
  }
}

module.exports = SetTransmitPowerMessage;

