/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message');

  function SetChannelSearchTimeoutMessage(channel, searchTimeout) {

    Message.call(this, undefined, Message.prototype.SET_CHANNEL_SEARCH_TIMEOUT);
    this.encode(channel, searchTimeout);
  }

  SetChannelSearchTimeoutMessage.prototype = Object.create(Message.prototype);

  SetChannelSearchTimeoutMessage.prototype.constructor = SetChannelSearchTimeoutMessage;

  SetChannelSearchTimeoutMessage.prototype.encode = function(channel, searchTimeout) {
    var msgBuffer = new Uint8Array(2);

    msgBuffer[0] = channel;
    msgBuffer[1] = searchTimeout;

    this.setContent(msgBuffer);

    this.channel = channel;
    this.highPrioritySearchTimeout = searchTimeout;

  };

  SetChannelSearchTimeoutMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + "Ch " + this.channel + " high priority search timeout" + this.highPrioritySearchTimeout;
  };

  module.exports = SetChannelSearchTimeoutMessage;
  
