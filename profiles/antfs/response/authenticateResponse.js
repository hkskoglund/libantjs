/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function AuthenticateResponse(responseType,authenticationStringLength,clientSerialNumber)
  {

      if (typeof responseType === 'object' && responseType.constructor.name === 'Uint8Array')
      {
        this.deserialize(responseType);
      } else {
          this.responseType = responseType;
          this.authenticationStringLength = authenticationStringLength;
          this.clientSerialNumber = clientSerialNumber;
    }
  }

  AuthenticateResponse.prototype.CLIENT_SERIAL_NUMBER = 0x00;
  AuthenticateResponse.prototype.ACCEPT = 0x01;
  AuthenticateResponse.prototype.REJECT = 0x02;

  AuthenticateResponse.prototype.ID = 0x84;

  AuthenticateResponse.prototype.deserialize = function (data)
  {
      var dv = new DataView(data.buffer),
          i;

      // data[0] should be 0x44 ANT-FS RESPONSE/COMMAND
      // data[1] should be 0x84;
      
      this.responseType = data[2];
      this.authenticationStringLength = data[3];
      this.authentication = '';
      this.clientSerialNumber = dv.getUint32(4+data.byteOffset,true);

      for (i = 0; i < this.authenticationStringLength && data[8+i] !== 0x00; i++)
      {
          this.authentication += String.fromCharCode(data[8+i]); // Static method on String
      }

  };

  module.exports = AuthenticateResponse;
  return module.exports;

});
