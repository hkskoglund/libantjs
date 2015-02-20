/* global define: true, Uint8Array: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('./Message');

    function OpenChannelMessage(channel){

        Message.call(this,undefined,Message.prototype.MESSAGE.OPEN_CHANNEL);
        this.encode(channel);
    }

    OpenChannelMessage.prototype = Object.create(Message.prototype);

    OpenChannelMessage.prototype.constructor = OpenChannelMessage;

    OpenChannelMessage.prototype.encode = function (channel)
    {
      var msgBuffer = new Uint8Array([channel]);
      this.channel = channel;

      this.setContent(msgBuffer.buffer);
    };

    OpenChannelMessage.prototype.toString = function (){
        return Message.prototype.toString();
    };

    module.exports = OpenChannelMessage;
    return module.exports;
});
