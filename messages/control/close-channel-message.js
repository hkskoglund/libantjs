'use strict';

  var Message = require('../message');

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
  
