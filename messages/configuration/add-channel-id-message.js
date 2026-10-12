'use strict';
import Message from '../message.js';
import ChannelId from '../../channel/channel-id.js';

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
    const deviceTypeName = ChannelId.getDeviceTypeName(this.deviceType);
    const deviceNumber = this.deviceNumber === 0 ? 'any (wildcard)' : this.deviceNumber;
    const deviceType = this.deviceType === 0
      ? 'any (wildcard)'
      : this.deviceType + (deviceTypeName ? ' (' + deviceTypeName + ')' : '');
    const transmissionType = this.transmissionType === 0
      ? 'any (wildcard)'
      : ChannelId.describeTransmissionType(this.transmissionType);

    return Message.prototype.toString.call(this) + ' Ch ' + this.channel + ' list index ' + this.listIndex +
      ': device number ' + deviceNumber + ', device type ' + deviceType +
      ', transmission type ' + transmissionType;
  }
}

export default AddChannelIdMessage;
