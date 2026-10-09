'use strict';

var Message = require('../message');

class AdvancedBurstCurrentConfigurationMessage extends Message {
  constructor(data) {

    super(data);
  }

  decode(data) {

    this.maxPacketLength = this.content[0];

    this.requiredFeature = {
      ADV_BURST_FREQUENCY_HOP_ENABLED: this.content[1] & 0x01
    };

    this.optionalFeature = {
      ADV_BURST_FREQUENCY_HOP_ENABLED: this.content[4] & 0x01
    };

    // Optional

    if (this.content.length >= 9) {
      this.stallCount = (this.content[8] << 8) | this.content[7];
    }

    if (this.content.length >= 10)
      this.retryCount = this.content[9];
  }

  toString() {

    var msg = Message.prototype.toString.call(this) + ' Current config. ';

    msg += ' | Max packet length : ';

    switch (this.maxPacketLength) {
      case 0x01:
        msg += '8-byte ';
        break;
      case 0x02:
        msg += '16-byte ';
        break;
      case 0x03:
        msg += '24-byte ';
        break;
      default:
        msg += '??-byte ';
        break;
    }

    msg += ' | required ';

    msg += (this.requiredFeature.ADV_BURST_FREQUENCY_HOP_ENABLED ? '+' : '-') + " Advanced Burst Frequency Hop ";

    msg += ' | optional ';

    msg += (this.optionalFeature.ADV_BURST_FREQUENCY_HOP_ENABLED ? '+' : '-') + " Advanced Burst Frequency Hop ";

    if (this.stallCount >= 0)
      msg += ' | Stall count : ' + this.stallCount + ' (' + this.stallCount * 3 + ' ms)';

    if (this.retryCount >= 0)
      msg += ' | Retry count : ' + this.retryCount + ' (' + this.retryCount * 5 + ' retries)';

    return msg;
  }
}

module.exports = AdvancedBurstCurrentConfigurationMessage;

