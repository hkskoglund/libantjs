/* global define: true, Uint8Array: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var Message = require('../Message');

  function OpenChannelMessage(channel) {

    Message.call(this, undefined, Message.prototype.OPEN_CHANNEL);
    this.encode(channel);
  }

  OpenChannelMessage.prototype = Object.create(Message.prototype);

  OpenChannelMessage.prototype.constructor = OpenChannelMessage;

  OpenChannelMessage.prototype.encode = function(channel) {
    this.setContent(new Uint8Array([channel]));
  };

  OpenChannelMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this);
  };

  module.exports = OpenChannelMessage;
  return module.exports;
});