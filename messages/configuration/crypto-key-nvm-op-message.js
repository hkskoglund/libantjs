'use strict';
import Message from '../message.js';

// Spec 9.5.2.36 - load: [0, nvmKeyIndex, volatileKeyIndex], store: [1, nvmKeyIndex, key (16 bytes)]
class CryptoKeyNvmOpMessage extends Message {
  constructor(operation, nvmKeyIndex, keyOrVolatileIndex) {
    super(undefined, Message.CRYPTO_KEY_NVM_OP);
    this.encode(operation, nvmKeyIndex, keyOrVolatileIndex);
  }

  encode(operation, nvmKeyIndex, keyOrVolatileIndex = 0) {
    if (!Number.isInteger(nvmKeyIndex) || nvmKeyIndex < 0 || nvmKeyIndex > 3)
      throw new RangeError('NVM key index must be between 0 and 3');

    let content;

    if (operation === CryptoKeyNvmOpMessage.LOAD) {
      content = Uint8Array.of(operation, nvmKeyIndex, keyOrVolatileIndex);
    } else if (operation === CryptoKeyNvmOpMessage.STORE) {
      if (!keyOrVolatileIndex || keyOrVolatileIndex.length !== 16)
        throw new RangeError('Encryption key must be 16 bytes');
      content = new Uint8Array(18);
      content[0] = operation;
      content[1] = nvmKeyIndex;
      content.set(keyOrVolatileIndex, 2);
    } else
      throw new RangeError('Operation must be 0 (load) or 1 (store)');

    this.operation = operation;
    this.nvmKeyIndex = nvmKeyIndex;
    this.setContent(content);
  }

  toString() {
    return Message.prototype.toString.call(this) + (this.operation === CryptoKeyNvmOpMessage.LOAD ? " load" : " store") + " NVM key index " + this.nvmKeyIndex;
  }

  static LOAD = 0x00;
  static STORE = 0x01;
}

export default CryptoKeyNvmOpMessage;
