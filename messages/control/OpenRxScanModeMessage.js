/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

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
