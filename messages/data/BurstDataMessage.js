/* global define: true, Uint8Array: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {
  'use strict';

  var AcknowledgedDataMessage = require('./AcknowledgedDataMessage'),
     Message = require('../Message');

  function BurstDataMessage(data) {
    Message.call(this, data, Message.prototype.BURST_TRANSFER_DATA);
  }

  BurstDataMessage.prototype = Object.create(AcknowledgedDataMessage.prototype);
  BurstDataMessage.prototype.constructor = BurstDataMessage;

  module.exports = BurstDataMessage;
  return module.exports;
});
