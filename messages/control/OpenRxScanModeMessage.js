/* global define: true, Uint8Array: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var Message = require('../Message');

  function OpenRxScanModeMessage() {

    Message.call(this, undefined, Message.prototype.OPEN_RX_SCAN_MODE);
    this.encode();

  }

  OpenRxScanModeMessage.prototype = Object.create(Message.prototype);
  OpenRxScanModeMessage.prototype.constructor = OpenRxScanModeMessage;

  OpenRxScanModeMessage.prototype.encode = function() {
    this.setContent(new Uint8Array(1));
  };

  module.exports = OpenRxScanModeMessage;
  return module.exports;
});