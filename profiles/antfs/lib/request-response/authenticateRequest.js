/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  function AuthenticateRequest(commandType, authenticationStringLength, hostSerialNumber) {
    this.commandType = commandType || AuthenticateRequest.prototype.PROCEED_TO_TRANSPORT;
    this.authenticationStringLength = authenticationStringLength || 0;
    this.hostSerialNumber = hostSerialNumber || 0;

  }

  AuthenticateRequest.prototype.PROCEED_TO_TRANSPORT = 0x00; // Pass-through
  AuthenticateRequest.prototype.REQUEST_CLIENT_DEVICE_SERIAL_NUMBER = 0x01;
  AuthenticateRequest.prototype.REQUEST_PAIRING = 0x02;
  AuthenticateRequest.prototype.REQUEST_PASSKEY_EXCHANGE = 0x03;

  AuthenticateRequest.prototype.ID = 0x04;

  AuthenticateRequest.prototype.requestProceedToTransport = function(hostSerialNumber) {
    this.request(AuthenticateRequest.prototype.PROCEED_TO_TRANSPORT, hostSerialNumber);
  };

  AuthenticateRequest.prototype.requestSerialNumber = function(hostSerialNumber) {
    this.request(AuthenticateRequest.prototype.REQUEST_CLIENT_DEVICE_SERIAL_NUMBER, hostSerialNumber);
  };

  AuthenticateRequest.prototype.requestPairing = function(hostSerialNumber, hostname) {

    if (hostname)
      this.hostname = hostname;
    this.request(AuthenticateRequest.prototype.REQUEST_PAIRING, hostSerialNumber, hostname);
  };

  AuthenticateRequest.prototype.requestPasskeyExchange = function(hostSerialNumber, passkey) {
    this.request(AuthenticateRequest.prototype.REQUEST_PASSKEY_EXCHANGE, hostSerialNumber, passkey);
  };

  AuthenticateRequest.prototype.request = function(commandType, hostSerialNumber, authenticationString) {
    this.commandType = commandType;

    if (authenticationString) {
      this.authenticationStringLength = authenticationString.length;
      this.authenticationString = authenticationString;
    } else
      this.authenticationStringLength = 0;

    this.hostSerialNumber = hostSerialNumber;
  };

  AuthenticateRequest.prototype.serialize = function() {
    var command = new Uint8Array(8 + this.authenticationStringLength),
      dv = new DataView(command.buffer),
      byteNr;

    command[0] = 0x44; // ANT-FS COMMAND message
    command[1] = this.ID;
    command[2] = this.commandType;
    command[3] = this.authenticationStringLength;
    dv.setUint32(4, this.hostSerialNumber, true);

    // Host friendly name if pairing, client passkey if paskey exchange

    if (this.authenticationStringLength) {
      for (byteNr = 0; byteNr <= this.authenticationStringLength; byteNr++) {
        command[8 + byteNr] = this.authenticationString.charCodeAt(byteNr);
      }
    }

    return command;
  };

  AuthenticateRequest.prototype.toString = function() {
    var cmdType;

    switch (this.commandType) {

      case AuthenticateRequest.prototype.PROCEED_TO_TRANSPORT:

        cmdType = 'proceed to transport';
        break;

      case AuthenticateRequest.prototype.REQUEST_CLIENT_DEVICE_SERIAL_NUMBER:

        cmdType = 'get client serial number';
        break;

      case AuthenticateRequest.prototype.REQUEST_PAIRING:

        cmdType = 'pairing';
        if (this.authenticationStringLength)
          cmdType += ', hostname ' + this.authenticationString;
        break;

      case AuthenticateRequest.prototype.REQUEST_PASSKEY_EXCHANGE:

        cmdType = 'passkey exchange';
        break;
    }

    return 'AUTHENTICATE ' + cmdType + ' host serial number ' + this.hostSerialNumber;
  };

  module.exports = AuthenticateRequest;
  return module.exports;
