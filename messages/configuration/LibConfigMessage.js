/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message');

  function LibConfigMessage(libConfig) {

    Message.call(this, undefined, Message.prototype.LIBCONFIG);

    this.encode(libConfig || 0);
  }

  LibConfigMessage.prototype = Object.create(Message.prototype);

  LibConfigMessage.prototype.constructor = LibConfigMessage;


  LibConfigMessage.prototype.encode = function(libConfig) {

    this.libConfig = libConfig;

    this.setContent(new Uint8Array([Message.prototype.FILLER_BYTE, libConfig]));
  };


  LibConfigMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + " libconfig " + this.libConfig;
  };

  module.exports = LibConfigMessage;
  
