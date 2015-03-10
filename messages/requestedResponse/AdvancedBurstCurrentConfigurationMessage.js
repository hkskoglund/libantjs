/* global define: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var Message = require('../Message');

  function AdvancedBurstCurrentConfigurationMessage(data) {

    Message.call(this, data);

  }

  AdvancedBurstCurrentConfigurationMessage.prototype = Object.create(Message.prototype);

  AdvancedBurstCurrentConfigurationMessage.prototype.constructor = AdvancedBurstCurrentConfigurationMessage;

  AdvancedBurstCurrentConfigurationMessage.prototype.decode = function(data) {
    this.maxPacketLength = this.content[0];

    this.requiredFeature = {
      ADV_BURST_FREQUENCY_HOP_ENABLED: this.content[1] & 0x01
    };

    this.optionalFeature = {
      ADV_BURST_FREQUENCY_HOP_ENABLED: this.content[4] & 0x01
    };

    // Optional

    if (this.content[8] && this.content[7]) {
      this.stallCount = (this.content[8] << 8) | this.content[7];
    }

    if (this.content[9])
      this.retryCount = this.content[9];

  };

  AdvancedBurstCurrentConfigurationMessage.prototype.toString = function() {

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
  };

  module.exports = AdvancedBurstCurrentConfigurationMessage;
  return module.exports;
});