/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    'use strict';

    var Message = require('./Message');

    function SetProximitySearchMessage(channel, searchThreshold) {

        Message.call(this,undefined,Message.prototype.MESSAGE.SET_PROXIMITY_SEARCH);
        this.encode(channel, searchThreshold);

    }

    SetProximitySearchMessage.prototype = Object.create(Message.prototype);

    SetProximitySearchMessage.prototype.constructor = SetProximitySearchMessage;

    SetProximitySearchMessage.prototype.encode = function (channel, searchThreshold) {

      var msgBuffer = new Uint8Array(2);

      msgBuffer[0] = channel;
      msgBuffer[1] = searchThreshold; // 0 - disabled, 1:10 - closes to farthest

      this.channel = channel;
      this.searchThreshold = searchThreshold;

      this.setContent(msgBuffer.buffer);

    };

    SetProximitySearchMessage.prototype.toString = function () {
        return Message.prototype.toString() + " C# " + this.channel + " search threshold " + this.searchThreshold;
    };

    module.exports = SetProximitySearchMessage;
    return module.exports;
});
