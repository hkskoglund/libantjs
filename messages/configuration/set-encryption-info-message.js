'use strict';
import Message from '../message.js';

class SetEncryptionInfoMessage extends Message {
  constructor(parameter, data) {
    super(undefined, Message.SET_ENCRYPTION_INFO);
    this.encode(parameter, data);
  }

  encode(parameter, data) {
    const length = SetEncryptionInfoMessage.LENGTH[parameter];

    if (length === undefined)
      throw new RangeError('Encryption info parameter must be 0 (encryption ID), 1 (user information string) or 2 (random number seed)');

    if (!data || data.length !== length)
      throw new RangeError('Encryption info parameter ' + parameter + ' requires ' + length + ' bytes');

    const content = new Uint8Array(length + 1);

    content[0] = parameter;
    content.set(data, 1);

    this.parameter = parameter;
    this.data = Uint8Array.from(data);
    this.setContent(content);
  }

  toString() {
    return Message.prototype.toString.call(this) + " parameter " + this.parameter;
  }

  static ENCRYPTION_ID = 0x00;
  static USER_INFORMATION_STRING = 0x01;
  static RANDOM_NUMBER_SEED = 0x02;
  static LENGTH = { 0: 4, 1: 19, 2: 16 };
}

export default SetEncryptionInfoMessage;
