'use strict';

var Message = require('../message'),
  Channel = require('../../channel/channel');

class ChannelStatusMessage extends Message {
  constructor(data) {

    super(data);
  }

  decode(data) {

    var status = this.content[1];

    this.state = status & parseInt("00000011", 2); // Lower 2 bits

    this.net = (status & parseInt("00001100", 2)) >> 2;

    this.type = (status & parseInt("11110000", 2)); // Bit 4-7

    // Tip from http://www.i-programmer.info/programming/javascript/2550-javascript-bit-manipulation.html
  }

  toString() {

    return Message.prototype.toString.call(this) + " Ch " + this.channel + ' Net ' + this.net + " " + Channel.TYPE[this.type] + " " +
      Channel.STATE[this.state];
  }
}

module.exports = ChannelStatusMessage;

