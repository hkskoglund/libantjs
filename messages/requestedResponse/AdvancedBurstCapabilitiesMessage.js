/* global define: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var Message = require('../Message');

  function AdvancedBurstCapabilitiesMessage(data) {

    Message.call(this, data);

  }

  AdvancedBurstCapabilitiesMessage.prototype = Object.create(Message.prototype);

  AdvancedBurstCapabilitiesMessage.prototype.constructor = AdvancedBurstCapabilitiesMessage;

  AdvancedBurstCapabilitiesMessage.prototype.decode = function(data) {
    this.maxPacketLength = this.content[0];

    // Supported features

    this.ADV_BURST_FREQUENCY_HOP_ENABLED = this.content[1] & 0x01;

  };

  AdvancedBurstCapabilitiesMessage.prototype.toString = function() {

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
  };

  module.exports = AdvancedBurstCapabilitiesMessage;
  return module.exports;
});