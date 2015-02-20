/* global define: true, DataView: true, ArrayBuffer: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

  'use strict';

  var Message = require('./Message');

  function SetChannelPeriodMessage(channel, messagePeriod){

      Message.call(this,undefined,Message.prototype.MESSAGE.SET_CHANNEL_PERIOD);
      this.encode(channel, messagePeriod);

  }

  SetChannelPeriodMessage.prototype = Object.create(Message.prototype);

  SetChannelPeriodMessage.prototype.constructor = SetChannelPeriodMessage;

  SetChannelPeriodMessage.prototype.encode = function (channel, messagePeriod){
    var msgBuffer = new DataView(new ArrayBuffer(3));

    msgBuffer.setUint8(0,channel);
    msgBuffer.setUint16(1,messagePeriod, true);

    this.channel = channel;
    this.messagePeriod = messagePeriod;

    this.setContent(msgBuffer.buffer);

  };

  SetChannelPeriodMessage.prototype.toString = function (){
      return Message.prototype.toString() + " C# " + this.channel + " message period " + this.messagePeriod;
  };

  module.exports = SetChannelPeriodMessage;
  return module.exports;
});
