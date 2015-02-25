/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

  function ChannelState(state)
  {
    this.state = state;

  }

  ChannelState.prototype.UNASSIGNED = 0x00;

  ChannelState.prototype.ASSIGNED = 0x01;

  ChannelState.prototype.SEARCHING = 0x02;

  ChannelState.prototype.TRACKING = 0x03;

  ChannelState.prototype.toString = function ()
  {

    var states = {
      0x00 : 'Unassigned',
      0x01 : 'Assigned',
      0x02 : 'Searching',
      0x03 : 'Tracking'
    };

    return states[this.state];
  };

    module.exports = ChannelState;
    return module.exports;
});
