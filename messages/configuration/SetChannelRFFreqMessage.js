/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message');

  function SetChannelRFFreqMessage(channel, RFFreq) {

    Message.call(this, undefined, Message.prototype.SET_CHANNEL_RFFREQ);

    this.encode(channel, RFFreq);

  }

  SetChannelRFFreqMessage.prototype = Object.create(Message.prototype);

  SetChannelRFFreqMessage.prototype.constructor = SetChannelRFFreqMessage;

  SetChannelRFFreqMessage.prototype.encode = function(channel, RFFreq) {
    var msgBuffer = new Uint8Array(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = RFFreq || 66;

    this.channel = channel;
    this.RFFreq = RFFreq;

    this.setContent(msgBuffer);

  };


  SetChannelRFFreqMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " RF freq. " + this.RFFreq;
  };

  module.exports = SetChannelRFFreqMessage;
  return module.exports;
