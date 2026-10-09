'use strict';

var Message = require('../message');

class SetNetworkKeyMessage extends Message {
  constructor(net, key) {

    super(undefined, Message.prototype.SET_NETWORK_KEY);
    this.encode(net, key);
  }

  encode(net, key) {

    var msgBuffer = new Uint8Array(9);

    msgBuffer[0] = net;
    msgBuffer.set(key, 1);

    this.net = net;
    this.key = key;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this) + " Net " + this.net + " key " + this.key;
  }
}

module.exports = SetNetworkKeyMessage;

