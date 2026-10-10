'use strict';

var Message = require('../message');

class LibConfigMessage extends Message {
  constructor(libConfig) {

    super(undefined, Message.LIBCONFIG);

    this.encode(libConfig || 0);
  }

  encode(libConfig) {

    this.libConfig = libConfig;

    this.setContent(new Uint8Array([Message.FILLER_BYTE, libConfig]));
  }

  toString() {

    return Message.prototype.toString.call(this) + " libconfig " + this.libConfig;
  }
}

module.exports = LibConfigMessage;

