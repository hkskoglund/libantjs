/* global define: true, Uint8Array: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {
  'use strict';

  var BroadcastDataMessage = require('./BroadcastDataMessage'),
     Message = require('../Message');

  function AcknowledgedBroadcastDataMessage(data) {
    Message.call(this, data, Message.prototype.ACKNOWLEDGED_DATA);
  }

  AcknowledgedBroadcastDataMessage.prototype = Object.create(BroadcastDataMessage.prototype);
  AcknowledgedBroadcastDataMessage.prototype.constructor = AcknowledgedBroadcastDataMessage;

  module.exports = AcknowledgedBroadcastDataMessage;
  return module.exports;
});
