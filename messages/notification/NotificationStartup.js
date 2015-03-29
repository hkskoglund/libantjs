/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */
  'use strict';
  var Message = require('../Message');

  // Notification startup raw buffer for COMMAND_RESET : <Buffer a4 01 6f 20 ea>
  function NotificationStartup(data) {

    Message.call(this, data, Message.prototype.NOTIFICATION_STARTUP);
  }

  NotificationStartup.prototype = Object.create(Message.prototype);

  NotificationStartup.prototype.constructor = NotificationStartup;

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


  NotificationStartup.prototype.decode = function(data) {
    var msg,
      startupMessage = this.getContent()[0];

    if (startupMessage === NotificationStartup.prototype.POWER_ON_RESET.BIT_MASK) {
      msg = NotificationStartup.prototype.POWER_ON_RESET.MESSAGE;
      // code = NotificationStartup.prototype.POWER_ON_RESET.BIT_MASK;
    } else if (startupMessage === NotificationStartup.prototype.HARDWARE_RESET_LINE.BIT_MASK) {
      msg = NotificationStartup.prototype.HARDWARE_RESET_LINE.MESSAGE;
      //code = NotificationStartup.prototype.HARDWARE_RESET_LINE.BIT_MASK;
    } else if (startupMessage & NotificationStartup.prototype.WATCH_DOG_RESET.BIT_MASK) {
      msg = NotificationStartup.prototype.WATCH_DOG_RESET.MESSAGE;
      //code = NotificationStartup.prototype.WATCH_DOG_RESET.BIT_MASK;
    } else if (startupMessage & NotificationStartup.prototype.COMMAND_RESET.BIT_MASK) {
      msg = NotificationStartup.prototype.COMMAND_RESET.MESSAGE;
      //code = NotificationStartup.prototype.COMMAND_RESET.BIT;
    } else if (startupMessage & NotificationStartup.prototype.SYNCHRONOUS_RESET.BIT_MASK) {
      msg = NotificationStartup.prototype.SYNCHRONOUS_RESET.MESSAGE;
      //code = NotificationStartup.prototype.SYNCHRONOUS_RESET.CODE;
    } else if (startupMessage & NotificationStartup.prototype.SUSPEND_RESET.BIT_MASK) {
      msg = NotificationStartup.prototype.SUSPEND_RESET.MESSAGE;
      //code = NotificationStartup.prototype.SUSPEND_RESET.CODE;
    }

    this.message = msg;

    return this.message;

  };

  NotificationStartup.prototype.toString = function() {
    return Message.prototype.toString.call(this) + ' ' + this.message;
  };

  module.exports = NotificationStartup;
  return module.exports;
