/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function DisconnectCommand(timeDuration,appSpecificDuration)
  {
      this.timeDuration = timeDuration;
      this.appSpecificDuration = appSpecificDuration;

  }

  DisconnectCommand.prototype.RETURN_TO_LINK_LAYER = 0x00;
  DisconnectCommand.prototype.RETURN_TO_BROADCAST_MODE = 0x01;
  DisconnectCommand.prototype.INVALID = 0x00;
  DisconnectCommand.prototype.DISABLE = 0x00;

  DisconnectCommand.prototype.ID = 0x03;

  DisconnectCommand.prototype.serialize = function ()
  {
      var command = new Uint8Array(4);

      command[0] = 0x44; // ANT-FS COMMAND message
      command[1] = this.ID;
      command[2] = this.timeDuration || DisconnectCommand.prototype.DISABLE;
      command[3] = this.appSpecificDuration || DisconnectCommand.prototype.DISABLE;

      return command;
  };

  module.exports = DisconnectCommand;
  return module.exports;

});
