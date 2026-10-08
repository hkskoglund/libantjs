'use strict';

  var Message = require('../message');

  function ResetSystemMessage() {

    Message.call(this, undefined, Message.prototype.RESET_SYSTEM);

    this.encode();
  }

  ResetSystemMessage.prototype = Object.create(Message.prototype);

  ResetSystemMessage.prototype.constructor = ResetSystemMessage;

  ResetSystemMessage.prototype.encode = function() {
    this.setContent(new Uint8Array(1));
  };

  module.exports = ResetSystemMessage;
  
