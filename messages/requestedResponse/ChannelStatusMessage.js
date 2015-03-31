/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message'),
    Channel = require('../../channel/channel');

  function ChannelStatusMessage(data) {
    Message.call(this, data);
  }

  ChannelStatusMessage.prototype = Object.create(Message.prototype);

  ChannelStatusMessage.prototype.constructor = ChannelStatusMessage;

  ChannelStatusMessage.prototype.decode = function(data) {
    var status = this.content[1];

    this.state = status & parseInt("00000011", 2); // Lower 2 bits

    this.net = (status & parseInt("00001100", 2)) >> 2;

    this.type = (status & parseInt("11110000", 2)); // Bit 4-7

    // Tip from http://www.i-programmer.info/programming/javascript/2550-javascript-bit-manipulation.html

  };

  ChannelStatusMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + " Ch " + this.channel + ' Net ' + this.net + " " + Channel.prototype.TYPE[this.type] + " " +
      Channel.prototype.STATE[this.state];
  };

  module.exports = ChannelStatusMessage;
  return module.exports;
