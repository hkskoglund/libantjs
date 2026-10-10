'use strict';
import Message from '../message.js';



class ConfigureAdvancedBurstMessage extends Message {
  constructor(enable, maxPacketLength, requiredFeatures, optionalFeatures, stallCount, retryCount) {

    super(undefined, Message.CONFIGURE_ADVANCED_BURST);
    this.encode(enable,maxPacketLength,requiredFeatures,optionalFeatures,stallCount,retryCount);
  }

  encode(enable, maxPacketLength, requiredFeatures, optionalFeatures, stallCount, retryCount) {

    var msgBuffer;

    if (typeof stallCount !== 'number' && typeof retryCount !== 'number')
      msgBuffer = new Uint8Array(9);
    else {
      msgBuffer = new Uint8Array(12);

      msgBuffer[9] = stallCount & 0xFF;
      msgBuffer[10] = (stallCount & 0xFF00) >> 8;
      msgBuffer[11] = retryCount;

      this.stallCount = stallCount;
      this.retryCount = retryCount;
    }

    msgBuffer[0] = Message.FILLER_BYTE;
    msgBuffer[1] = enable;
    msgBuffer[2] = maxPacketLength;

    msgBuffer[3] = requiredFeatures & 0xFF;
    msgBuffer[4] = (requiredFeatures & 0xFF00) >> 8;
    msgBuffer[5] = (requiredFeatures & 0xFF0000) >> 16;

    msgBuffer[6] = optionalFeatures & 0xFF;
    msgBuffer[7] = (optionalFeatures & 0xFF00) >> 8;
    msgBuffer[8] = (optionalFeatures & 0xFF0000) >> 16;

    this.enable = enable;
    this.maxPacketLength = maxPacketLength;
    this.requiredFeatures = requiredFeatures;
    this.optionalFeatures = optionalFeatures;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this)+ ' enabled '+this.enable+' max packet length '+
          this.maxPacketLength+' required '+this.requiredFeatures+ ' optional '+this.optionalFeatures;
  }

  static ENABLE = 0x01;
  static DISABLE = 0x00;
  static MAX_PACKET_8BYTES = 0x01;
  static MAX_PACKET_16BYTES = 0x02;
  static MAX_PACKET_24BYTES = 0x03;
}







export default ConfigureAdvancedBurstMessage;

