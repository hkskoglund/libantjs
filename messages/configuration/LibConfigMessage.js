/* global define: true, Uint8Array: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(function(require, exports, module) {

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
  return module.exports;
});