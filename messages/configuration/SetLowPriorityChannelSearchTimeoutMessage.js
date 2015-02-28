/* global define: true, Uint8Array: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('../Message'),
        LowPrioritySearchTimeout = require('../../channel/LowPrioritySearchTimeout');

    function SetLowPrioriyChannelSearchTimeoutMessage(channel, searchTimeout){

        Message.call(this,undefined,Message.prototype.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT);
        this.encode(channel, searchTimeout);

    }

    SetLowPrioriyChannelSearchTimeoutMessage.prototype = Object.create(Message.prototype);

    SetLowPrioriyChannelSearchTimeoutMessage.prototype.constructor = SetLowPrioriyChannelSearchTimeoutMessage;

    SetLowPrioriyChannelSearchTimeoutMessage.prototype.encode = function (channel, searchTimeout)
    {
      var msgBuffer = new Uint8Array(2);

      msgBuffer[0] = channel;

      if (typeof searchTimeout !== 'number')
            msgBuffer[1] = searchTimeout.getRawValue();
          else
              msgBuffer[1] = searchTimeout;

      this.setPayload(msgBuffer.buffer);

      this.channel = channel;

      this.lowPrioritySearchTimeout = new LowPrioritySearchTimeout(searchTimeout);

    };

    SetLowPrioriyChannelSearchTimeoutMessage.prototype.toString = function (){
        return Message.prototype.toString.call(this)+' Ch '+this.channel+' low priority search timeout '+this.lowPrioritySearchTimeout.toString();
    };

    module.exports = SetLowPrioriyChannelSearchTimeoutMessage;
    return module.exports;
});
