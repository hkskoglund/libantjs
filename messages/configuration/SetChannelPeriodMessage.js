/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message');

  function SetChannelPeriodMessage(channel, messagePeriod) {

    Message.call(this, undefined, Message.prototype.SET_CHANNEL_PERIOD);
    this.encode(channel, messagePeriod);

  }

  SetChannelPeriodMessage.prototype = Object.create(Message.prototype);

  SetChannelPeriodMessage.prototype.constructor = SetChannelPeriodMessage;

  SetChannelPeriodMessage.prototype.encode = function(channel, messagePeriod) {
    var   msgBuffer = new Uint8Array(3);

    msgBuffer[0] =  channel;
    msgBuffer[1] = messagePeriod & 0xFF;
    msgBuffer[2] = (messagePeriod & 0xFF00) >> 8;

    this.channel = channel;
    this.messagePeriod = messagePeriod;

    this.setContent(msgBuffer);

  };

  SetChannelPeriodMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " message period " + this.messagePeriod;
  };

  module.exports = SetChannelPeriodMessage;
  
