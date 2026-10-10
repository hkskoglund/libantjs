'use strict';
import Message from '../message.js';



class SetProximitySearchMessage extends Message {
  constructor(channel, searchThreshold) {

    super(undefined, Message.SET_PROXIMITY_SEARCH);
    this.encode(channel, searchThreshold);
  }

  encode(channel, searchThreshold) {

    var msgBuffer = new Uint8Array([channel, searchThreshold]);

    this.searchThreshold = searchThreshold;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this) + " Ch " + this.channel + " search threshold " + this.searchThreshold;
  }
}

export default SetProximitySearchMessage;

