/* global define: true, Uint8Array: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('../Message');

    function SetChannelRFFreqMessage(channel, RFFreq){

        Message.call(this,undefined,Message.prototype.MESSAGE.SET_CHANNEL_RFFREQ);

        this.encode(channel, RFFreq);

    }

    SetChannelRFFreqMessage.prototype = Object.create(Message.prototype);

    SetChannelRFFreqMessage.prototype.constructor = SetChannelRFFreqMessage;

    SetChannelRFFreqMessage.prototype.encode = function (channel, RFFreq)
    {
      var msgBuffer = new Uint8Array(2);

      msgBuffer[0] = channel;
      msgBuffer[1] = RFFreq || 66;

      this.channel = channel;
      this.RFFreq = RFFreq;

      this.setContent(msgBuffer.buffer);

    };


    SetChannelRFFreqMessage.prototype.toString = function (){
        return Message.prototype.toString.call(this) + " C# " + this.channel + " RF freq. " + this.RFFreq;
    };

    module.exports = SetChannelRFFreqMessage;
    return module.exports;
});
