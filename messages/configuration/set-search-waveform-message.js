'use strict';

var Message = require('../message');

class SetSearchWaveform extends Message {
  constructor(channel, searchWaveform) {

    super(undefined, Message.prototype.SET_SEARCH_WAVEFORM);

    this.encode(channel, searchWaveform);
  }

  encode(channel, searchWaveform) {

    var msgBuffer = new Uint8Array([channel, searchWaveform]);

    this.searchWaveform = searchWaveform;

    this.setContent(msgBuffer);
  }

  toString() {

    return Message.prototype.toString.call(this) + ' Ch ' + this.channel + ' search waveform ' + this.searchWaveform;
  }
}

SetSearchWaveform.prototype.STANDARD_SEARCH_WAVEFORM = 316;
SetSearchWaveform.prototype.FAST_SEARCH_WAVEFORM = 97;

module.exports = SetSearchWaveform;

