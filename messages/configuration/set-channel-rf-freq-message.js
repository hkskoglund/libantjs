'use strict';

  var Message = require('../message');

  function SetChannelRFFreqMessage(channel, RFFreq) {

    Message.call(this, undefined, Message.prototype.SET_CHANNEL_RFFREQ);

    this.encode(channel, RFFreq);

  }

  SetChannelRFFreqMessage.prototype = Object.create(Message.prototype);

  SetChannelRFFreqMessage.prototype.constructor = SetChannelRFFreqMessage;

  SetChannelRFFreqMessage.prototype.encode = function(channel, RFFreq) {
    var msgBuffer = new Uint8Array(2);

    if (typeof RFFreq === 'undefined')
      RFFreq = 66;

    msgBuffer[0] = channel;
    msgBuffer[1] = RFFreq;

    this.channel = channel;
    this.RFFreq = RFFreq;

    this.setContent(msgBuffer);

  };


  SetChannelRFFreqMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " RF freq. " + this.RFFreq;
  };

  module.exports = SetChannelRFFreqMessage;
  
