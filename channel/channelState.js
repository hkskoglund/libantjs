/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

  function ChannelState(state)
  {
    this.state = state;

  }

  ChannelState.prototype.STATE = {
    UNASSIGNED : 0x00,
    0x00 : 'Unassigned',
    ASSIGNED : 0x01,
    0x01 : 'Assigned',
    SEARCHING : 0x02,
    0x02 : 'Searching',
    TRACKING : 0x03,
    0x03 : 'Tracking'
  };

  ChannelState.prototype.toString = function ()
  {

    return ChannelState.prototype.STATE[this.state];
  };

    module.exports = ChannelState;
    return module.exports;
});
