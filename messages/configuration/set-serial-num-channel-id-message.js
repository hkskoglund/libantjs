'use strict';
import Message from '../message.js';



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

    this.deviceType = deviceType;
    this.transmissionType = transmissionType;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this) + " Ch " + this.channel + " deviceType" + this.deviceType + " transmissionType " + this.transmissionType;
  }

  static PAIRING_BIT_MASK = parseInt("10000000", 2);
  static DEVICE_TYPE_ID_BIT_MASK = parseInt("01111111", 2);
}

 // Bit 7

 // Bit 0-6

export default SetSerialNumChannelIdMessage;

