'use strict';

var Message = require('../message');

class SleepMessage extends Message {
  constructor() {

    super(undefined, Message.prototype.SLEEP_MESSAGE);
    this.encode();
  }

  encode() {

    this.setContent(new Uint8Array([0]));
  }
}

module.exports = SleepMessage;
