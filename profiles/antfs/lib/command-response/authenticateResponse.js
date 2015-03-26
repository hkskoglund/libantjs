/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function AuthenticateResponse(type, authenticationStringLength, clientSerialNumber) {

    if (typeof type === 'object' && type.constructor.name === 'Uint8Array') {
      this.deserialize(type);
    } else {
      this.type = type;
      this.authenticationStringLength = authenticationStringLength;
      this.clientSerialNumber = clientSerialNumber;
    }
  }

  AuthenticateResponse.prototype.CLIENT_SERIAL_NUMBER = 0x00;
  AuthenticateResponse.prototype.ACCEPT = 0x01;
  AuthenticateResponse.prototype.REJECT = 0x02;

  AuthenticateResponse.prototype.ID = 0x84;

  AuthenticateResponse.prototype.deserialize = function(data) {
    var dv = new DataView(data.buffer),
      i;

    // data[0] should be 0x44 ANT-FS RESPONSE/COMMAND
    // data[1] should be 0x84;

    this.type = data[2];
    this.authenticationStringLength = data[3];
    this.authenticationString = '';
    this.clientSerialNumber = dv.getUint32(4 + data.byteOffset, true);

    for (i = 0; i < this.authenticationStringLength && data[8 + i] !== 0x00; i++) {
      this.authenticationString += String.fromCharCode(data[8 + i]); // Static method on String
    }

  };

  AuthenticateResponse.prototype.toString = function() {
    var msg = 'AUTHENTICATE ';

    switch (this.type) {
      case AuthenticateResponse.prototype.CLIENT_SERIAL_NUMBER:

        if (this.authenticationString)
          msg += 'name ' + this.authenticationString;
        break;

      case AuthenticateResponse.prototype.ACCEPT:

        msg += 'accept';
        break;

      case AuthenticateResponse.prototype.REJECT:
        msg += 'reject';
        break;
    }

    return msg + ', serial number ' + this.clientSerialNumber;
  };

  module.exports = AuthenticateResponse;
  return module.exports;

});