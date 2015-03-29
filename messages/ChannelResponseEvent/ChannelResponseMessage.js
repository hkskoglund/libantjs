/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  'use strict';

  var Message = require('../Message'),
    ChannelResponseEvent = require('../../channel/channelResponseEvent');

  function ChannelResponseMessage(data) {

    Message.call(this, data, Message.prototype.CHANNEL_RESPONSE);
  }

  ChannelResponseMessage.prototype = Object.create(Message.prototype);

  ChannelResponseMessage.prototype.constructor = ChannelResponseMessage;

  ChannelResponseMessage.prototype.decode = function() {
    var initiatingId = this.content[1],
      code = this.content[2];

    this.response = new ChannelResponseEvent(this.channel, initiatingId, code);

  };

  ChannelResponseMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + " " + this.response.toString();
  };

  module.exports = ChannelResponseMessage;
  return module.exports;
