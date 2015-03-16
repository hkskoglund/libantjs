/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function AuthenticateCommand(commandType,authenticationStringLength,hostSerialNumber)
  {
      this.commandType = commandType;
      this.authenticationStringLength = authenticationStringLength;
      this.hostSerialNumber = hostSerialNumber;

  }

  AuthenticateCommand.prototype.PROCEED_TO_TRANSPORT = 0x00; // Pass-through
  AuthenticateCommand.prototype.REQUEST_CLIENT_DEVICE_SERIAL_NUMBER = 0x01;
  AuthenticateCommand.prototype.REQUEST_PAIRING = 0x02;
  AuthenticateCommand.prototype.REQUEST_PASSKEY_EXCHANGE = 0x03;

  AuthenticateCommand.prototype.ID = 0x04;

  AuthenticateCommand.prototype.proceedToTransport = function (hostSerialNumber)
  {
    this._noPasskeyCommand(AuthenticateCommand.prototype.PROCEED_TO_TRANSPORT);
  };

  AuthenticateCommand.prototype.requestClientSerialNumber = function (hostSerialNumber)
  {
    this._noPasskeyCommand(AuthenticateCommand.prototype.REQUEST_CLIENT_DEVICE_SERIAL_NUMBER);
  };

  AuthenticateCommand.prototype._noPasskeyCommand = function (commandType,hostSerialNumber)
  {
    this.commandType = commandType;
    this.authenticationStringLength = 0;
    this.hostSerialNumber = hostSerialNumber;
  };

  AuthenticateCommand.prototype.serialize = function ()
  {
      var command = new Uint8Array(8),
          dv = new DataView(command.buffer);

      command[0] = 0x44; // ANT-FS COMMAND message
      command[1] = this.ID;
      command[2] = this.commandType || AuthenticateCommand.prototype.PROCEED_TO_TRANSPORT;
      command[3] = this.authenticationStringLength || 0;
      dv.setUint32(4,this.hostSerialNumber || 0,true);

      return command;
  };

  module.exports = AuthenticateCommand;
  return module.exports;

});
