'use strict';

var Message = require('../message');

class OpenRxScanModeMessage extends Message {
  constructor(channel) {

    super(undefined, Message.prototype.OPEN_RX_SCAN_MODE);
    this.encode(channel);
  }

  encode(channel) {

    this.setContent(Uint8Array.of(channel));
  }
}

module.exports = OpenRxScanModeMessage;

