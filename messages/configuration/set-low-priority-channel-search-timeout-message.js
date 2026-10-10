'use strict';

var Message = require('../message');

// No interruption of other opened channels during low priority search
class SetLowPrioriyChannelSearchTimeoutMessage extends Message {
  constructor(channel, searchTimeout) {

    super(undefined, Message.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT);
    this.encode(channel, searchTimeout);
  }

  encode(channel, searchTimeout) {

    var msgBuffer = new Uint8Array([channel, searchTimeout]);

    this.setContent(msgBuffer);

    this.lowPrioritySearchTimeout = searchTimeout;
  }

  toString() {

    var msg = Message.prototype.toString.call(this) + ' Ch ' + this.channel + ' low priority search timeout ' + this.lowPrioritySearchTimeout;

    switch (this.lowPrioritySearchTimeout) {
      case SetLowPrioriyChannelSearchTimeoutMessage.DISABLE : msg += ' DISABLED'; break;
      case SetLowPrioriyChannelSearchTimeoutMessage.INFINITE : msg += ' INFINITE'; break;
      default : msg += ' '+this.lowPrioritySearchTimeout * 2.5 +'s';
    }

    return msg;
  }

  static DISABLE = 0x00;
  static INFINITE = 0xFF;
}




module.exports = SetLowPrioriyChannelSearchTimeoutMessage;

