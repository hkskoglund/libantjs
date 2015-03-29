/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  'use strict';

  var Message = require('../Message');

  function SetSearchWaveform(channel, searchWaveform) {

    Message.call(this, undefined, Message.prototype.SET_SEARCH_WAVEFORM);

    this.encode(channel, searchWaveform);

  }

  SetSearchWaveform.prototype = Object.create(Message.prototype);

  SetSearchWaveform.prototype.constructor = SetSearchWaveform;

  SetSearchWaveform.prototype.STANDARD_SEARCH_WAVEFORM = 316;
  SetSearchWaveform.prototype.FAST_SEARCH_WAVEFORM = 97;

  SetSearchWaveform.prototype.encode = function(channel, searchWaveform) {
    var msgBuffer = new Uint8Array([channel, searchWaveform]);

    this.searchWaveform = searchWaveform;

    this.setContent(msgBuffer);

  };

  SetSearchWaveform.prototype.toString = function() {
    return Message.prototype.toString.call(this) + ' Ch ' + this.channel + ' search waveform ' + this.searchWaveform;
  };

  module.exports = SetSearchWaveform;
  return module.exports;
