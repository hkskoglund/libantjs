'use strict';
import Message from '../message.js';

class CwTestModeMessage extends Message {
  constructor(transmitPower, rfFrequency) {
    super(undefined, Message.CW_TEST_MODE);
    this.encode(transmitPower, rfFrequency);
  }

  encode(transmitPower, rfFrequency) {
    this.transmitPower = transmitPower;
    this.rfFrequency = rfFrequency;
    this.setContent(Uint8Array.of(Message.FILLER_BYTE, transmitPower, rfFrequency));
  }

  toString() {
    return Message.prototype.toString.call(this) + " power " + this.transmitPower + " RF frequency " + this.rfFrequency;
  }
}

export default CwTestModeMessage;
