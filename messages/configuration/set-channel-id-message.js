'use strict';

var Message = require('../message');

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

    return Message.prototype.toString.call(this) + " Ch " + this.channel + " deviceNumber " + this.deviceNumber + " deviceType " + this.deviceType + " transmissionType " + this.transmissionType;
  }

  static PAIRING_BIT_MASK = parseInt("10000000", 2);
  static DEVICE_TYPE_ID_BIT_MASK = parseInt("01111111", 2);
}

 // Bit 7

 // Bit 0-6

module.exports = SetChannelIDMessage;

