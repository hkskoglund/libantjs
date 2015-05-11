/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message');

  function SetNetworkKeyMessage(net, key) {

    Message.call(this, undefined, Message.prototype.SET_NETWORK_KEY);
    this.encode(net, key);

  }

  SetNetworkKeyMessage.prototype = Object.create(Message.prototype);

  SetNetworkKeyMessage.prototype.constructor = SetNetworkKeyMessage;

  SetNetworkKeyMessage.prototype.encode = function(net, key) {
    var msgBuffer = new Uint8Array(9);

    msgBuffer[0] = net;
    msgBuffer.set(key, 1);

    this.net = net;
    this.key = key;

    this.setContent(msgBuffer);

  };

  SetNetworkKeyMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + " Net " + this.net + " key " + this.key;
  };

  module.exports = SetNetworkKeyMessage;
  
