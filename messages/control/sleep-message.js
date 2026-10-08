'use strict';

  var Message = require('../message');

  function SleepMessage() {
    Message.call(this, undefined, Message.prototype.SLEEP_MESSAGE);
    this.encode();
  }

  SleepMessage.prototype = Object.create(Message.prototype);
  SleepMessage.prototype.constructor = SleepMessage;

  SleepMessage.prototype.encode = function() {
    this.setContent(new Uint8Array([0]));
  };

  module.exports = SleepMessage;
