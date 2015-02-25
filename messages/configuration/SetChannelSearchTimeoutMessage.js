/* global define: true, Uint8Array: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('../Message'),
        HighPrioritySearchTimeout = require('./util/HighPrioritySearchTimeout');

    function SetChannelSearchTimeoutMessage(channel, searchTimeout)
    {

        Message.call(this,undefined,Message.prototype.SET_CHANNEL_SEARCH_TIMEOUT);
        this.encode(channel, searchTimeout);
    }

    SetChannelSearchTimeoutMessage.prototype = Object.create(Message.prototype);

    SetChannelSearchTimeoutMessage.prototype.constructor = SetChannelSearchTimeoutMessage;

    SetChannelSearchTimeoutMessage.prototype.encode = function (channel, searchTimeout)
    {
      var msgBuffer = new Uint8Array(2);

      msgBuffer[0] = channel;
      if (typeof searchTimeout !== 'number')
        msgBuffer[1] = searchTimeout.getRawValue();
      else
          msgBuffer[1] = searchTimeout;

      this.channel = channel;
      this.HPsearchTimeout = searchTimeout;

      this.setContent(msgBuffer.buffer);

    };

    SetChannelSearchTimeoutMessage.prototype.toString = function (){
        return Message.prototype.toString.call(this)+ "Ch "+this.channel+" HP search timeout" +this.HPsearchTimeout;
    };

    module.exports = SetChannelSearchTimeoutMessage;
    return module.exports;
});
