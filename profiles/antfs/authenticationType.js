/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function AuthenticationType(type) {
    this.type = type;
  }

  AuthenticationType.prototype.PASSTHROUGH = 0x00;
  AuthenticationType.prototype.NOTAPPLICABLE = 0x01;
  AuthenticationType.prototype.PAIRING_ONLY = 0x02;
  AuthenticationType.prototype.PASSKEY_AND_PAIRING_ONLY = 0x03;

  AuthenticationType.prototype.get = function ()
  {
    return this.type;
  };

  AuthenticationType.prototype.toString = function() {

     switch (this.type)
     {
       case AuthenticationType.prototype.PASSTHROUGH : return "Pass-through (pairing & passkey optional)";
       case AuthenticationType.prototype.PAIRING_ONLY : return "Pairing only";
       case AuthenticationType.prototype.PASSKEY_AND_PAIRING_ONLY : return "Passkey and pairing only";
     }
  };

  module.exports = AuthenticationType;
  return module.exports;
});
