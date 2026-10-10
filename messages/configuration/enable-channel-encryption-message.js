'use strict';
import Message from '../message.js';

class EnableChannelEncryptionMessage extends Message {
  constructor(channel, mode, volatileKeyIndex, decimationRate) {
    super(undefined, Message.ENABLE_CHANNEL_ENCRYPTION);
    this.encode(channel, mode, volatileKeyIndex, decimationRate);
  }

  encode(channel, mode, volatileKeyIndex = 0, decimationRate = 1) {
    if (!Number.isInteger(mode) || mode < 0 || mode > 2)
      throw new RangeError('Encryption mode must be 0 (disable), 1 (enable) or 2 (enable with user information string)');

    if (!Number.isInteger(volatileKeyIndex) || volatileKeyIndex < 0 || volatileKeyIndex > 0xFF)
      throw new RangeError('Volatile key index must be a byte');

    if (!Number.isInteger(decimationRate) || decimationRate < 1 || decimationRate > 0xFF)
      throw new RangeError('Decimation rate must be between 1 and 255');

    this.channel = channel;
    this.mode = mode;
    this.volatileKeyIndex = volatileKeyIndex;
    this.decimationRate = decimationRate;
    this.setContent(Uint8Array.of(channel, mode, volatileKeyIndex, decimationRate));
  }

  toString() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " mode " + this.mode + " key " + this.volatileKeyIndex + " decimation " + this.decimationRate;
  }
}

export default EnableChannelEncryptionMessage;
