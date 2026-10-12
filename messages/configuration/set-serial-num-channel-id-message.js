'use strict';
import Message from '../message.js';
import ChannelId from '../../channel/channel-id.js';



class SetSerialNumChannelIdMessage extends Message {
  constructor(channel, deviceType, transmissionType) {

    super(undefined, Message.SET_SERIAL_NUM_CHANNEL_ID);
    this.encode(channel, deviceType, transmissionType);
  }

  encode(channel, deviceType, transmissionType) {

    var msgBuffer = new Uint8Array(4),
      pairingRequest = (deviceType & SetSerialNumChannelIdMessage.PAIRING_BIT_MASK) >> 7; // Bit 7 - Range 0 .. 1

    msgBuffer[0] = channel;
    msgBuffer[1] = pairingRequest;
    msgBuffer[2] = deviceType & SetSerialNumChannelIdMessage.DEVICE_TYPE_ID_BIT_MASK; // Slave: 0 = match any device type - Range 0 .. 127
    msgBuffer[3] = transmissionType; // Slave: 0 = match any transmission type

    this.channel = channel;
    this.deviceType = deviceType;
    this.transmissionType = transmissionType;
    this.pair = pairingRequest;

    this.setContent(msgBuffer);
  }

  toString() {

    const deviceType = this.deviceType & SetSerialNumChannelIdMessage.DEVICE_TYPE_ID_BIT_MASK;
    const typeName = ChannelId.getDeviceTypeName(deviceType);
    const deviceTypeDescription = deviceType === 0
      ? 'any (wildcard)'
      : deviceType + (typeName ? ' (' + typeName + ')' : '');
    const transmissionTypeDescription = this.transmissionType === 0
      ? 'any (wildcard)'
      : ChannelId.describeTransmissionType(this.transmissionType);

    return Message.prototype.toString.call(this) + ' Ch ' + this.channel +
      ': device number from serial number, device type ' + deviceTypeDescription +
      ', transmission type ' + transmissionTypeDescription +
      (this.pair ? ', pairing requested' : '');
  }

  static PAIRING_BIT_MASK = parseInt("10000000", 2);
  static DEVICE_TYPE_ID_BIT_MASK = parseInt("01111111", 2);
}

 // Bit 7

 // Bit 0-6

export default SetSerialNumChannelIdMessage;
