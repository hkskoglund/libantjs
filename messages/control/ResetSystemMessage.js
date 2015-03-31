/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message');

  function ResetSystemMessage() {

    Message.call(this, undefined, Message.prototype.RESET_SYSTEM);

    this.encode();
  }

  ResetSystemMessage.prototype = Object.create(Message.prototype);

  ResetSystemMessage.prototype.constructor = ResetSystemMessage;

  ResetSystemMessage.prototype.encode = function() {
    this.setContent(new Uint8Array(1));
  };

  module.exports = ResetSystemMessage;
  return module.exports;
