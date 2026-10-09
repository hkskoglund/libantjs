'use strict';
var Message = require('../message');

// Notification startup raw buffer for COMMAND_RESET : <Buffer a4 01 6f 20 ea>
class NotificationStartup extends Message {
  constructor(data) {

    super(data, Message.prototype.NOTIFICATION_STARTUP);
  }

  decode(data) {

    var msg,
      startupMessage = this.getContent()[0];

    if (startupMessage === NotificationStartup.prototype.POWER_ON_RESET.BIT_MASK) {
      msg = NotificationStartup.prototype.POWER_ON_RESET.MESSAGE;
    } else if (startupMessage === NotificationStartup.prototype.HARDWARE_RESET_LINE.BIT_MASK) {
      msg = NotificationStartup.prototype.HARDWARE_RESET_LINE.MESSAGE;
    } else if (startupMessage & NotificationStartup.prototype.WATCH_DOG_RESET.BIT_MASK) {
      msg = NotificationStartup.prototype.WATCH_DOG_RESET.MESSAGE;
    } else if (startupMessage & NotificationStartup.prototype.COMMAND_RESET.BIT_MASK) {
      msg = NotificationStartup.prototype.COMMAND_RESET.MESSAGE;
    } else if (startupMessage & NotificationStartup.prototype.SYNCHRONOUS_RESET.BIT_MASK) {
      msg = NotificationStartup.prototype.SYNCHRONOUS_RESET.MESSAGE;
    } else if (startupMessage & NotificationStartup.prototype.SUSPEND_RESET.BIT_MASK) {
      msg = NotificationStartup.prototype.SUSPEND_RESET.MESSAGE;
    }

    this.message = msg;

    return this.message;
  }

  toString() {

    return Message.prototype.toString.call(this) + ' ' + this.message;
  }
}

NotificationStartup.prototype.POWER_ON_RESET = {
  BIT_MASK: 0x00,
  MESSAGE: 'POWER_ON_RESET'
};

NotificationStartup.prototype.HARDWARE_RESET_LINE = {
  BIT_MASK: 0x01,
  MESSAGE: 'HARDWARE_RESET_LINE'
};

NotificationStartup.prototype.WATCH_DOG_RESET = {
  BIT_MASK: 1 << 2,
  MESSAGE: 'WATCH_DOG_RESET'
};

NotificationStartup.prototype.COMMAND_RESET = {
  BIT_MASK: 1 << 5,
  MESSAGE: 'COMMAND_RESET'
};

NotificationStartup.prototype.SYNCHRONOUS_RESET = {
  BIT_MASK: 1 << 6,
  MESSAGE: 'SYNCHRONOUS_RESET'
};

NotificationStartup.prototype.SUSPEND_RESET = {
  BIT_MASK: 1 << 7,
  MESSAGE: 'SUSPEND_RESET'
};

module.exports = NotificationStartup;

