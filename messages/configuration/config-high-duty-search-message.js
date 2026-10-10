'use strict';
import Message from '../message.js';

class ConfigHighDutySearchMessage extends Message {
  constructor(enable, suppressionCycle) {
    super(undefined, Message.HIGH_DUTY_SEARCH);
    this.encode(enable, suppressionCycle);
  }

  encode(enable, suppressionCycle) {
    this.enable = enable ? 1 : 0;
    this.suppressionCycle = suppressionCycle;
    this.setContent(suppressionCycle === undefined ?
      Uint8Array.of(Message.FILLER_BYTE, this.enable) :
      Uint8Array.of(Message.FILLER_BYTE, this.enable, suppressionCycle));
  }

  toString() {
    return Message.prototype.toString.call(this) + " enable " + this.enable + (this.suppressionCycle === undefined ? "" : " suppression cycle " + this.suppressionCycle);
  }
}

export default ConfigHighDutySearchMessage;
