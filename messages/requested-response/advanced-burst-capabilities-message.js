'use strict';
import Message from '../message.js';



class AdvancedBurstCapabilitiesMessage extends Message {
  constructor(data) {

    super(data);
  }

  decode(data) {

    this.maxPacketLength = this.content[0];

    // Supported features

    this.ADV_BURST_FREQUENCY_HOP_ENABLED = this.content[1] & 0x01;
  }

  toString() {

    var msg = Message.prototype.toString.call(this);

    msg += ' | Max packet length : ';

    switch (this.maxPacketLength) {
      case 0x01:
        msg += '8-byte |';
        break;
      case 0x02:
        msg += '16-byte |';
        break;
      case 0x03:
        msg += '24-byte |';
        break;
      default:
        msg += '??-byte |';
        break;
    }

    msg += (this.ADV_BURST_FREQUENCY_HOP_ENABLED ? '+' : '-') + " Advanced Burst Frequency Hop | ";

    return msg;
  }
}

export default AdvancedBurstCapabilitiesMessage;

