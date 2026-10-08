'use strict';

  var Message = require('../message'),
    ChannelResponseEvent = require('../../channel/channel-response-event');

  function ChannelResponseMessage(data) {

    Message.call(this, data, Message.prototype.CHANNEL_RESPONSE);
  }

  ChannelResponseMessage.prototype = Object.create(Message.prototype);

  ChannelResponseMessage.prototype.constructor = ChannelResponseMessage;

  ChannelResponseMessage.prototype.decode = function() {
    if (this.content.byteLength !== 3)
      throw new RangeError('Channel response message must contain exactly 3 bytes');

    var initiatingId = this.content[1],
      code = this.content[2];

    this.response = new ChannelResponseEvent(this.channel, initiatingId, code);

  };

  ChannelResponseMessage.prototype.isRFevent = function ()
  {
    return this.response.isRFevent();
  };

  ChannelResponseMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + " " + this.response.toString();
  };

  module.exports = ChannelResponseMessage;
