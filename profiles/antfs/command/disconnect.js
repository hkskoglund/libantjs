/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function Disconnect(timeDuration,appSpecificDuration)
  {
      this.id = 0x03;
      this.timeDuration = frequency;
      this.appSpecificDuration = appSpecificDuration;

  }

  Disconnect.prototype.RETURN_TO_LINK_LAYER = 0x00;
  Disconnect.prototype.RETURN_TO_BROADCAST_MODE = 0x01;
  Disconnect.prototype.INVALID = 0x00;
  Disconnect.prototype.DISABLE = 0x00;

  Disconnect.prototype.serialize = function ()
  {
      var command = new Uint8Array(4);

      command[0] = 0x44; // ANT-FS COMMAND message
      command[1] = this.id;
      command[2] = this.timeDuration || Disconnect.prototype.DISABLE;
      command[3] = this.appSpecificDuration || Disconnect.prototype.DISABLE;

      return command;
  };

  module.exports = Disconnect;
  return module.exports;

});
