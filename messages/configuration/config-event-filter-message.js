'use strict';
import Message from '../message.js';

class ConfigEventFilterMessage extends Message {
  constructor(eventFilter) {
    super(undefined, Message.CONFIG_EVENT_FILTER);
    this.encode(eventFilter);
  }

  // Bit N filters event N+1, e.g. 0x04 filters event 3 (EVENT_TX); the filter is a 16-bit little endian bit field
  encode(eventFilter) {
    const content = new Uint8Array(3);

    new DataView(content.buffer).setUint16(1, eventFilter, true);

    this.eventFilter = eventFilter;
    this.setContent(content);
  }

  toString() {
    return Message.prototype.toString.call(this) + " filter 0x" + this.eventFilter.toString(16);
  }
}

export default ConfigEventFilterMessage;
