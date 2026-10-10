'use strict';
import Message from '../message.js';



class DeviceSerialNumberMessage extends Message {
  constructor(data) {

    super(data);
  }

  decode() {

    // SN 4 bytes Little Endian
    var dw = new DataView((new Uint8Array([this.content[0], this.content[1], this.content[2], this.content[3]])).buffer);

    this.serialNumber = dw.getUint32(0, true);
    this.serialNumberAsChannelId = dw.getUint16(0, true); // Lower 2-bytes
  }

  toString() {

    return Message.prototype.toString.call(this) + " " + this.serialNumber + ' (0x' + this.serialNumber.toString(16) + ')' + " lower 2-bytes " + this.serialNumberAsChannelId + ' (0x' + this.serialNumberAsChannelId.toString(16) + ')';
  }
}

export default DeviceSerialNumberMessage;

