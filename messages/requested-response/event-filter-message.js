'use strict';
import Message from '../message.js';

class EventFilterMessage extends Message {
  constructor(data) {
    super(data);
  }

  decode() {
    this.eventFilter = new DataView(this.content.buffer, this.content.byteOffset, this.content.byteLength).getUint16(1, true);
  }

  // Bit N set means event N+1 is filtered
  isFiltered(eventCode) {
    return Boolean(this.eventFilter & (1 << (eventCode - 1)));
  }

  toString() {
    return Message.prototype.toString.call(this) + " filter 0x" + this.eventFilter.toString(16);
  }
}

export default EventFilterMessage;
