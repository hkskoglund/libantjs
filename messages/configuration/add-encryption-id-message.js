'use strict';
import Message from '../message.js';

// Encrypted master channels only; shares its ID with Add Channel ID (spec 9.5.2.11)
class AddEncryptionIdMessage extends Message {
  constructor(channel, encryptionId, listIndex) {
    super(undefined, Message.ADD_CHANNEL_ID);
    this.encode(channel, encryptionId, listIndex);
  }

  encode(channel, encryptionId, listIndex) {
    if (!encryptionId || encryptionId.length !== 4)
      throw new RangeError('Encryption ID must be 4 bytes');

    if (!Number.isInteger(listIndex) || listIndex < 0 || listIndex > 3)
      throw new RangeError('Encryption ID list index must be between 0 and 3');

    const content = new Uint8Array(6);

    content[0] = channel;
    content.set(encryptionId, 1);
    content[5] = listIndex;

    this.channel = channel;
    this.encryptionId = Uint8Array.from(encryptionId);
    this.listIndex = listIndex;
    this.setContent(content);
  }

  toString() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " index " + this.listIndex + " encryption ID " + Buffer.from(this.encryptionId).toString('hex');
  }
}

export default AddEncryptionIdMessage;
