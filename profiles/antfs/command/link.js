/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function Link(frequency,period,hostSerialNumber)
  {
      this.id = 0x02;
      this.frequency = frequency;
      this.period = period;
      this.hostSerialNumber = hostSerialNumber;
  }

  Link.prototype.serialize = function ()
  {
      var command = new Uint8Array(8),
          dv = new DataView(command.buffer);

      command[0] = 0x44; // ANT-FS COMMAND message
      command[1] = this.id;
      command[2] = this.frequency;
      command[3] = this.period;
      dv.setUint32(4,this.hostSerialNumber,true);

      return command;
  };

  module.exports = Link;
  return module.exports;

});
