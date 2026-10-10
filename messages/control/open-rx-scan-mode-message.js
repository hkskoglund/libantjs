'use strict';
import Message from '../message.js';



class OpenRxScanModeMessage extends Message {
  constructor(syncChannelPacketsOnly) {

    super(undefined, Message.OPEN_RX_SCAN_MODE);
    this.encode(syncChannelPacketsOnly);
  }

  // Spec 9.5.4.5: filler byte followed by optional "synchronous channel packets only" flag
  encode(syncChannelPacketsOnly) {
    this.setContent(syncChannelPacketsOnly === undefined ?
      Uint8Array.of(Message.FILLER_BYTE) :
      Uint8Array.of(Message.FILLER_BYTE, syncChannelPacketsOnly ? 1 : 0));
  }
}

export default OpenRxScanModeMessage;

