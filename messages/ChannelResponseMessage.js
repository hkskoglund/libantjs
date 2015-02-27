/* global define: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }define(function (require, exports, module){

    'use strict';

    var Message = require('./Message'),
        ChannelResponse = require('../channel/channelResponse'),
        RFEvent = require('../channel/RFEvent');

    function ChannelResponseMessage(data)    {

        Message.call(this,data,Message.prototype.CHANNEL_RESPONSE);
    }

    ChannelResponseMessage.prototype = Object.create(Message.prototype);

    ChannelResponseMessage.prototype.constructor = ChannelResponseMessage;

    ChannelResponseMessage.prototype.decode = function ()    {
      var payload = this.getPayload(),
          channel = payload[0],
          initiatingId = payload[1],
          code = payload[2];

      switch (initiatingId)
      {
        case 0x01:  this.response = new RFEvent(channel,initiatingId,code);
                    break;

        default :   this.response = new ChannelResponse(channel,initiatingId,code);
                    break;
      }

    };

    ChannelResponseMessage.prototype.toString = function ()    {
        return Message.prototype.toString.call(this)+  " "+this.response.toString();
    };

    module.exports = ChannelResponseMessage;
    return module.exports;
});
