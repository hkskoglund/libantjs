'use strict';
import Message from '../message.js';

class AddChannelIdMessage extends Message {
  constructor(channel, deviceNum, deviceType, transmissionType, listIndex) {
    super(undefined, Message.ADD_CHANNEL_ID);
    this.encode(channel, deviceNum, deviceType, transmissionType, listIndex);
  }

  encode(channel, deviceNum, deviceType, transmissionType, listIndex) {
    const content = new Uint8Array(6);

    new DataView(content.buffer).setUint16(1, deviceNum, true);
    content[0] = channel;
    content[3] = deviceType & 0x7F;
    content[4] = transmissionType;
    content[5] = listIndex;

    this.channel = channel;
    this.deviceNumber = deviceNum;
    this.deviceType = deviceType & 0x7F;
    this.transmissionType = transmissionType;
    this.listIndex = listIndex;
    this.setContent(content);
  }

  toString() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " index " + this.listIndex + " deviceNumber " + this.deviceNumber + " deviceType " + this.deviceType + " transmissionType " + this.transmissionType;
  }
}

export default AddChannelIdMessage;
