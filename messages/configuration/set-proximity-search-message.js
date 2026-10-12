'use strict';
import Message from '../message.js';



class SetProximitySearchMessage extends Message {
  constructor(channel, searchThreshold) {

    super(undefined, Message.SET_PROXIMITY_SEARCH);
    this.encode(channel, searchThreshold);
  }

  encode(channel, searchThreshold) {

    var msgBuffer = new Uint8Array([channel, searchThreshold]);

    this.channel = channel;
    this.searchThreshold = searchThreshold;

    this.setContent(msgBuffer);
  }

  toString() {

    const description = this.searchThreshold === 0
      ? 'disabled'
      : 'ANT proximity bin ' + this.searchThreshold;

    return Message.prototype.toString.call(this) + ' Ch ' + this.channel +
      ' one-time proximity search threshold: ' + description;
  }
}

export default SetProximitySearchMessage;
