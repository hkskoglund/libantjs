'use strict';
import Message from '../message.js';



// No interruption of other opened channels during low priority search
class SetLowPrioriyChannelSearchTimeoutMessage extends Message {
  constructor(channel, searchTimeout) {

    super(undefined, Message.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT);
    this.encode(channel, searchTimeout);
  }

  encode(channel, searchTimeout) {

    var msgBuffer = new Uint8Array([channel, searchTimeout]);

    this.setContent(msgBuffer);

    this.channel = channel;
    this.lowPrioritySearchTimeout = searchTimeout;
  }

  toString() {

    const timeout = this.lowPrioritySearchTimeout;
    const description = timeout === SetLowPrioriyChannelSearchTimeoutMessage.DISABLE
      ? 'disabled'
      : timeout === SetLowPrioriyChannelSearchTimeoutMessage.INFINITE
        ? 'infinite'
        : (timeout * SetLowPrioriyChannelSearchTimeoutMessage.SECONDS_PER_COUNT) + ' s';

    return Message.prototype.toString.call(this) + ' Ch ' + this.channel +
      ' low-priority search timeout: ' + description + ' (' + timeout + ')';
  }

  static DISABLE = 0x00;
  static INFINITE = 0xFF;
  static SECONDS_PER_COUNT = 2.5;
}




export default SetLowPrioriyChannelSearchTimeoutMessage;
