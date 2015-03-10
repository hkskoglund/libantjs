/* global define: true, Uint8Array: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var Message = require('../Message');

  function CloseChannelMessage(channel) {

    Message.call(this, undefined, Message.prototype.CLOSE_CHANNEL);
    this.encode(channel);
  }

  CloseChannelMessage.prototype = Object.create(Message.prototype);

  CloseChannelMessage.prototype.constructor = CloseChannelMessage;

  CloseChannelMessage.prototype.encode = function(channel) {
    this.setContent(new Uint8Array([channel]));
  };

  CloseChannelMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this);
  };

  module.exports = CloseChannelMessage;
  return module.exports;
});