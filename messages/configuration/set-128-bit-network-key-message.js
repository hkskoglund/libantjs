'use strict';
import Message from '../message.js';

class Set128BitNetworkKeyMessage extends Message {
  constructor(net, key) {
    super(undefined, Message.SET_128BIT_NETWORK_KEY);
    this.encode(net, key);
  }

  encode(net, key) {
    if (!key || key.length !== 16)
      throw new RangeError('128-bit network key must be 16 bytes');

    const content = new Uint8Array(17);

    content[0] = net;
    content.set(key, 1);

    this.net = net;
    this.key = key;
    this.setContent(content);
  }

  toString() {
    return Message.prototype.toString.call(this) + " Net " + this.net + " key " + this.key;
  }
}

export default Set128BitNetworkKeyMessage;
