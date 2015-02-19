/* global define: true, DataView: true, ArrayBuffer: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

  "use strict";

  var Message = require('./Message');

  function SetChannelPeriodMessage(channel, messagePeriod) {

      var msgBuffer = new DataView(new ArrayBuffer(3));

      msgBuffer.setUint8(0,channel);
      msgBuffer.setUint16(1,messagePeriod, true);

      Message.call(this);

      this.id = Message.prototype.MESSAGE.SET_CHANNEL_MESSAGING_PERIOD;

      this.channel = channel;
      this.messagePeriod = messagePeriod;

      this.setContent(msgBuffer.buffer);

  }

  SetChannelPeriodMessage.prototype = Object.create(Message.prototype);

  SetChannelPeriodMessage.prototype.constructor = SetChannelPeriodMessage;


  SetChannelPeriodMessage.prototype.toString = function () {
      return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " message period " + this.messagePeriod;
  };

  module.exports = SetChannelPeriodMessage;
  return module.exports;
});
