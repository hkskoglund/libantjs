/* global define: true, Uint8Array: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var Message = require('../Message');

  function SetProximitySearchMessage(channel, searchThreshold) {

    Message.call(this, undefined, Message.prototype.SET_PROXIMITY_SEARCH);
    this.encode(channel, searchThreshold);

  }

  SetProximitySearchMessage.prototype = Object.create(Message.prototype);

  SetProximitySearchMessage.prototype.constructor = SetProximitySearchMessage;

  SetProximitySearchMessage.prototype.encode = function(channel, searchThreshold) {

    var msgBuffer = new Uint8Array([channel,searchThreshold]);

    this.searchThreshold = searchThreshold;

    this.setContent(msgBuffer);

  };

  SetProximitySearchMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + " search threshold " + this.searchThreshold;
  };

  module.exports = SetProximitySearchMessage;
  return module.exports;
});
