'use strict';
import Message from '../message.js';



class SetNetworkKeyMessage extends Message {
  constructor(net, key, keyType = 'custom') {

    super(undefined, Message.SET_NETWORK_KEY);
    this.encode(net, key, keyType);
  }

  encode(net, key, keyType) {

    var msgBuffer = new Uint8Array(9);

    msgBuffer[0] = net;
    msgBuffer.set(key, 1);

    this.net = net;
    this.key = key;
    this.keyType = keyType;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this) + " Net " + this.net + " key type " + this.keyType;
  }
}

export default SetNetworkKeyMessage;
