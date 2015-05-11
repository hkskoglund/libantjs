/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
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
  
