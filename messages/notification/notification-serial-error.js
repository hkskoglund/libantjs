'use strict';
import Message from '../message.js';



class NotificationSerialError extends Message {
  constructor(data) {

    super(data);
  }

  decode(data) {

    var msg,
      code,
      errorCode = this.channel,
      faultMessage;

    if (errorCode === NotificationSerialError.SERIAL_ERROR.FIRST_BYTE_NOT_SYNC.CODE) {
      msg = NotificationSerialError.SERIAL_ERROR.FIRST_BYTE_NOT_SYNC.MESSAGE;
      code = NotificationSerialError.SERIAL_ERROR.FIRST_BYTE_NOT_SYNC.CODE;
    } else if (errorCode === NotificationSerialError.SERIAL_ERROR.CRC_INCORRECT.CODE) {
      msg = NotificationSerialError.SERIAL_ERROR.CRC_INCORRECT.MESSAGE;
      code = NotificationSerialError.SERIAL_ERROR.CRC_INCORRECT.CODE;
    } else if (errorCode === NotificationSerialError.SERIAL_ERROR.MESSAGE_TOO_LARGE.CODE) {
      msg = NotificationSerialError.SERIAL_ERROR.MESSAGE_TOO_LARGE.MESSAGE;
      code = NotificationSerialError.SERIAL_ERROR.MESSAGE_TOO_LARGE.CODE;
      faultMessage = this.data.subarray(4); // The message that caused the fault
    }

    this.message = {
      'text': msg,
      'code': code,
      'faultMessage': faultMessage
    };

    return this.message;
  }

  toString() {

    return Message.prototype.toString.call(this) + " " + this.length + " " + this.message.text;
  }

  static SERIAL_ERROR = {
  FIRST_BYTE_NOT_SYNC: {
    CODE: 0x00,
    MESSAGE: 'First byte of USB packet not SYNC = 0xA4'
  },
  CRC_INCORRECT: {
    CODE: 0x02,
    MESSAGE: 'CRC of ANT message incorrect'
  },
  MESSAGE_TOO_LARGE: {
    CODE: 0x03,
    MESSAGE: 'ANT Message is too large'
  }
};
}



export default NotificationSerialError;

