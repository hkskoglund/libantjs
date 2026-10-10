'use strict';
import Message from '../message.js';

// Spec 9.5.7.12 - response to a request for message 0x7D: parameter byte followed by its value
class EncryptionParametersMessage extends Message {
  constructor(data) {
    super(data);
  }

  decode() {
    this.parameter = this.content[0];
    this.value = this.content.subarray(1);

    if (this.parameter === EncryptionParametersMessage.MAX_SUPPORTED_MODE)
      this.maxSupportedMode = this.value[0];
    else if (this.parameter === EncryptionParametersMessage.ENCRYPTION_ID)
      this.encryptionId = this.value;
    else if (this.parameter === EncryptionParametersMessage.USER_INFORMATION_STRING)
      this.userInformationString = this.value;
  }

  toString() {
    return Message.prototype.toString.call(this) + " parameter " + this.parameter + " " + Array.from(this.value);
  }

  static MAX_SUPPORTED_MODE = 0x00;
  static ENCRYPTION_ID = 0x01;
  static USER_INFORMATION_STRING = 0x02;
}

export default EncryptionParametersMessage;
