'use strict';

  var Message = require('../Message');

  function OpenRxScanModeMessage(channel) {

    Message.call(this, undefined, Message.prototype.OPEN_RX_SCAN_MODE);
    this.encode(channel);

  }

  OpenRxScanModeMessage.prototype = Object.create(Message.prototype);
  OpenRxScanModeMessage.prototype.constructor = OpenRxScanModeMessage;

  OpenRxScanModeMessage.prototype.encode = function(channel) {
    this.setContent(Uint8Array.of(channel));
  };

  module.exports = OpenRxScanModeMessage;
  
