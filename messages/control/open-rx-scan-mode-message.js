'use strict';
import Message from '../message.js';



class OpenRxScanModeMessage extends Message {
  constructor(channel) {

    super(undefined, Message.OPEN_RX_SCAN_MODE);
    this.encode(channel);
  }

  encode(channel) {

    this.setContent(Uint8Array.of(channel));
  }
}

export default OpenRxScanModeMessage;

