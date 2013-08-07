var ANTMessage = require('./ANTMessage.js');

function NotificationStartup(data) {
    ANTMessage.call(this, data);
    console.log("Notification", data);
    this.parse();
}

NotificationStartup.prototype = Object.create(ANTMessage.prototype);

NotificationStartup.prototype.constructor = NotificationStartup;

NotificationStartup.prototype.POWER_ON_RESET ={
            CODE : 0x00,
            MESSAGE : 'POWER_ON_RESET'
        },
 NotificationStartup.prototype.HARDWARE_RESET_LINE = {
            CODE : 0x01,
            MESSAGE : 'HARDWARE_RESET_LINE'
    },
 NotificationStartup.prototype.WATCH_DOG_RESET = {
            CODE : 0x02,
            MESSAGE : 'WATCH_DOG_RESET'
    },
NotificationStartup.prototype.COMMAND_RESET = {
            CODE : 0x03,
            MESSAGE : 'COMMAND_RESET'
    },
NotificationStartup.prototype.SYNCHRONOUS_RESET = {
            CODE : 0x04,
            MESSAGE : 'SYNCHRONOUS_RESET'
    },
NotificationStartup.prototype.SUSPEND_RESET = {
            CODE: 0x05,
            MESSAGE: 'SUSPEND_RESET'
    }

NotificationStartup.prototype.parse = function () {
    var msg, code;

    var startupMessage = this.content[0];

    if (startupMessage === 0) {
        msg = NotificationStartup.prototype.POWER_ON_RESET.MESSAGE
        code = NotificationStartup.prototype.POWER_ON_RESET.CODE;
    }
    else if (startupMessage === 1) {
        msg = NotificationStartup.prototype.HARDWARE_RESET_LINE.MESSAGE
        code = NotificationStartup.prototype.HARDWARE_RESET_LINE.CODE;
    }
    else if (startupMessage & (1 << 2)) {
        msg = NotificationStartup.prototype.WATCH_DOG_RESET.MESSAGE;
        code = NotificationStartup.prototype.WATCH_DOG_RESET.CODE;
    }
    else if (startupMessage & (1 << 5)) {
        msg = NotificationStartup.prototype.COMMAND_RESET.MESSAGE;
        code = NotificationStartup.prototype.COMMAND_RESET.CODE;
    }
    else if (startupMessage & (1 << 6)) {
        msg = NotificationStartup.prototype.SYNCHRONOUS_RESET.MESSAGE;
        code = NotificationStartup.prototype.SYNCHRONOUS_RESET.CODE;
    }
    else if (startupMessage & (1 << 7)) {
        msg = NotificationStartup.prototype.SUSPEND_RESET.MESSAGE;
        code = NotificationStartup.prototype.SUSPEND_RESET.CODE;
    }

    this.message = { 'timestamp' : Date.now(), 'class': 'Notifications', 'type': 'Start-up Message', 'text': msg, 'code': code };

    return this.message;

};

module.exports = NotificationStartup;