'use strict';

var Message = require('../message');

class ResetSystemMessage extends Message {
  constructor() {

    super(undefined, Message.RESET_SYSTEM);

    this.encode();
  }

  encode() {

    this.setContent(new Uint8Array(1));
  }
}

module.exports = ResetSystemMessage;

