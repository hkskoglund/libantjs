'use strict';
var Message = require('../message');

// Notification startup raw buffer for COMMAND_RESET : <Buffer a4 01 6f 20 ea>
class NotificationStartup extends Message {
  constructor(data) {

    super(data, Message.NOTIFICATION_STARTUP);
  }

  decode(data) {

    var msg,
      startupMessage = this.getContent()[0];

    if (startupMessage === NotificationStartup.POWER_ON_RESET.BIT_MASK) {
      msg = NotificationStartup.POWER_ON_RESET.MESSAGE;
    } else if (startupMessage === NotificationStartup.HARDWARE_RESET_LINE.BIT_MASK) {
      msg = NotificationStartup.HARDWARE_RESET_LINE.MESSAGE;
    } else if (startupMessage & NotificationStartup.WATCH_DOG_RESET.BIT_MASK) {
      msg = NotificationStartup.WATCH_DOG_RESET.MESSAGE;
    } else if (startupMessage & NotificationStartup.COMMAND_RESET.BIT_MASK) {
      msg = NotificationStartup.COMMAND_RESET.MESSAGE;
    } else if (startupMessage & NotificationStartup.SYNCHRONOUS_RESET.BIT_MASK) {
      msg = NotificationStartup.SYNCHRONOUS_RESET.MESSAGE;
    } else if (startupMessage & NotificationStartup.SUSPEND_RESET.BIT_MASK) {
      msg = NotificationStartup.SUSPEND_RESET.MESSAGE;
    }

    this.message = msg;

    return this.message;
  }

  toString() {

    return Message.prototype.toString.call(this) + ' ' + this.message;
  }

  static POWER_ON_RESET = {
  BIT_MASK: 0x00,
  MESSAGE: 'POWER_ON_RESET'
};
  static HARDWARE_RESET_LINE = {
  BIT_MASK: 0x01,
  MESSAGE: 'HARDWARE_RESET_LINE'
};
  static WATCH_DOG_RESET = {
  BIT_MASK: 1 << 2,
  MESSAGE: 'WATCH_DOG_RESET'
};
  static COMMAND_RESET = {
  BIT_MASK: 1 << 5,
  MESSAGE: 'COMMAND_RESET'
};
  static SYNCHRONOUS_RESET = {
  BIT_MASK: 1 << 6,
  MESSAGE: 'SYNCHRONOUS_RESET'
};
  static SUSPEND_RESET = {
  BIT_MASK: 1 << 7,
  MESSAGE: 'SUSPEND_RESET'
};
}













module.exports = NotificationStartup;

