/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message');

  // No interruption of other opened channels during low priority search
  function SetLowPrioriyChannelSearchTimeoutMessage(channel, searchTimeout) {

    Message.call(this, undefined, Message.prototype.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT);
    this.encode(channel, searchTimeout);

  }

  SetLowPrioriyChannelSearchTimeoutMessage.prototype = Object.create(Message.prototype);

  SetLowPrioriyChannelSearchTimeoutMessage.prototype.constructor = SetLowPrioriyChannelSearchTimeoutMessage;

  SetLowPrioriyChannelSearchTimeoutMessage.prototype.DISABLE = 0x00;
  SetLowPrioriyChannelSearchTimeoutMessage.prototype.INFINITE = 0xFF;

  SetLowPrioriyChannelSearchTimeoutMessage.prototype.encode = function(channel, searchTimeout) {
    var msgBuffer = new Uint8Array([channel, searchTimeout]);

    this.setContent(msgBuffer);

    this.lowPrioritySearchTimeout = searchTimeout;

  };

  SetLowPrioriyChannelSearchTimeoutMessage.prototype.toString = function() {

    var msg = Message.prototype.toString.call(this) + ' Ch ' + this.channel + ' low priority search timeout ' + this.lowPrioritySearchTimeout;

    switch (this.lowPrioritySearchTimeout) {
      case SetLowPrioriyChannelSearchTimeoutMessage.prototype.DISABLE : msg += ' DISABLED'; break;
      case SetLowPrioriyChannelSearchTimeoutMessage.prototype.INFINITE : msg += ' INFINITE'; break;
      default : msg += ' '+this.lowPrioritySearchTimeout * 2.5 +'s';
    }

    return msg;
  };

  module.exports = SetLowPrioriyChannelSearchTimeoutMessage;
  return module.exports;
