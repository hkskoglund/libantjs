/* global define: true, Uint8Array: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {
  'use strict';

  var BroadcastDataMessage = require('./BroadcastDataMessage'),
    Message = require('../Message');

  function AcknowledgedDataMessage(data) {
    Message.call(this, data, Message.prototype.ACKNOWLEDGED_DATA);
  }

  AcknowledgedDataMessage.prototype = Object.create(BroadcastDataMessage.prototype);
  AcknowledgedDataMessage.prototype.constructor = AcknowledgedDataMessage;

  module.exports = AcknowledgedDataMessage;
  return module.exports;
});