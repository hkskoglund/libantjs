/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
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
  
