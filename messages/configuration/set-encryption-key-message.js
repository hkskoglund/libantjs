'use strict';
import Message from '../message.js';

class SetEncryptionKeyMessage extends Message {
  constructor(volatileKeyIndex, key) {
    super(undefined, Message.SET_ENCRYPTION_KEY);
    this.encode(volatileKeyIndex, key);
  }

  encode(volatileKeyIndex, key) {
    if (!key || key.length !== 16)
      throw new RangeError('Encryption key must be 16 bytes');

    const content = new Uint8Array(17);

    content[0] = volatileKeyIndex;
    content.set(key, 1);

    this.volatileKeyIndex = volatileKeyIndex;
    this.setContent(content);
  }

  toString() {
    return Message.prototype.toString.call(this) + " key index " + this.volatileKeyIndex;
  }
}

export default SetEncryptionKeyMessage;
