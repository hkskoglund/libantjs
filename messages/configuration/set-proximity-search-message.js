'use strict';

var Message = require('../message');

class SetProximitySearchMessage extends Message {
  constructor(channel, searchThreshold) {

    super(undefined, Message.prototype.SET_PROXIMITY_SEARCH);
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

module.exports = SetProximitySearchMessage;

