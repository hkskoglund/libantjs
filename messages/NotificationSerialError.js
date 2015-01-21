/* global define: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
var ANTMessage = require('messages/ANTMessage');

function NotificationSerialError(data) {
    ANTMessage.call(this, data);
    
   // console.log("Notification", data);
    this.parse();

    this.name = "Notification: Serial Error";
    this.id = ANTMessage.prototype.MESSAGE.NOTIFICATION_SERIAL_ERROR;
}

NotificationSerialError.prototype = Object.create(ANTMessage.prototype);

NotificationSerialError.prototype.constructor = NotificationSerialError;

NotificationSerialError.prototype.SERIAL_ERROR = {
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


NotificationSerialError.prototype.parse = function () {
    var msg, code;

    var serialErrorMessage, errorCode,faultMessage;

    serialErrorMessage = this.content;
    errorCode = serialErrorMessage[0];

    if (errorCode === NotificationSerialError.prototype.SERIAL_ERROR.FIRST_BYTE_NOT_SYNC.CODE) {
        msg = NotificationSerialError.prototype.SERIAL_ERROR.FIRST_BYTE_NOT_SYNC.MESSAGE;
        code = NotificationSerialError.prototype.SERIAL_ERROR.FIRST_BYTE_NOT_SYNC.CODE;
    }
    else if (errorCode === NotificationSerialError.prototype.SERIAL_ERROR.CRC_INCORRECT.CODE) {
        msg = NotificationSerialError.prototype.SERIAL_ERROR.CRC_INCORRECT.MESSAGE;
        code = NotificationSerialError.prototype.SERIAL_ERROR.CRC_INCORRECT.CODE;
    }
    else if (errorCode === NotificationSerialError.prototype.SERIAL_ERROR.MESSAGE_TOO_LARGE.CODE) {
        msg = NotificationSerialError.prototype.SERIAL_ERROR.MESSAGE_TOO_LARGE.MESSAGE;
        code = NotificationSerialError.prototype.SERIAL_ERROR.MESSAGE_TOO_LARGE.CODE;
        faultMessage = serialErrorMessage.subarray(1);
    }

    this.message = { 'text': msg, 'code': code, 'faultMessage': faultMessage };

    return this.message;
};

NotificationSerialError.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " " + this.length + " " + this.message.text;
};

module.exports = NotificationSerialError;
return module.exports;
});
