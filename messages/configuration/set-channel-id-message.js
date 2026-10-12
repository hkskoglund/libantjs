'use strict';
import Message from '../message.js';
import ChannelId from '../../channel/channel-id.js';



class SetChannelIDMessage extends Message {
  constructor(channel, deviceNum, deviceType, transmissionType) {

    super(undefined, Message.SET_CHANNEL_ID);

    this.encode(channel, deviceNum, deviceType, transmissionType);
  }

  encode(channel, deviceNum, deviceType, transmissionType) {

    var
      msgBuffer = new Uint8Array(5),
      msgView = new DataView(msgBuffer.buffer),
      pairingRequest = (deviceType & SetChannelIDMessage.PAIRING_BIT_MASK) >> 7; // Bit 7 - Range 0 .. 1

    msgBuffer[0] = channel;
    msgView.setUint16(1, deviceNum, true);
    msgBuffer[3] = deviceType; // Slave: 0 = match any device type - Range 0 .. 127 if no pairing
    msgBuffer[4] = transmissionType; // Slave: 0 = match any transmission type

    this.deviceNumber = deviceNum;
    this.deviceType = deviceType;
    this.transmissionType = transmissionType;
    this.pair = pairingRequest;

    this.setContent(msgBuffer);
  }

  toString() {

    const deviceType = this.deviceType & SetChannelIDMessage.DEVICE_TYPE_ID_BIT_MASK;
    const typeName = ChannelId.getDeviceTypeName(deviceType);
    const deviceNumberDescription = this.deviceNumber === 0
      ? 'any (wildcard)'
      : this.deviceNumber;
    const deviceTypeDescription = deviceType === 0
      ? 'any (wildcard)'
      : deviceType + (typeName ? ' (' + typeName + ')' : '');
    const transmissionTypeDescription = this.transmissionType === 0
      ? 'any (wildcard)'
      : ChannelId.describeTransmissionType(this.transmissionType);
    const pairingDescription = this.pair ? ', pairing requested' : '';

    return Message.prototype.toString.call(this) + ' Ch ' + this.channel +
      ': device number ' + deviceNumberDescription +
      ', device type ' + deviceTypeDescription +
      ', transmission type ' + transmissionTypeDescription +
      pairingDescription;
  }

  static PAIRING_BIT_MASK = parseInt("10000000", 2);
  static DEVICE_TYPE_ID_BIT_MASK = parseInt("01111111", 2);
}

 // Bit 7

 // Bit 0-6

export default SetChannelIDMessage;
