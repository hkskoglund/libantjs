"use strict"
var ANTMessage = require('./ANTMessage.js');

function NotificationSerialError(data) {
    ANTMessage.call(this, data);
    
    console.log("Notification", data);
    this.parse();
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
        faultMessage = serialErrorMessage.slice(1);
    }

    //this.notificationSerialError = {
    //    timestamp: Date.now(),
    //    message: msg,
    //    code: code
    //};

    //this.emit(ANT.prototype.EVENT.LOG_MESSAGE, NotificationSerialError.prototype.ANT_MESSAGE.serial_error.friendly + " " + msg);
    //console.log("SERIAL ERROR ", msg);
    this.message = { 'timestamp': Date.now(), 'class': 'Notifications', 'type': 'Serial Error Message', 'text': msg, 'code': code, 'faultMessage': faultMessage };

    return this.message;
};

module.exports = NotificationSerialError
