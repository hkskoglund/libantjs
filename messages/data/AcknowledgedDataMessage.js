/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */
  /*jshint -W097 */
'use strict';

  var BroadcastDataMessage = require('./BroadcastDataMessage'),
    Message = require('../Message');

  function AcknowledgedDataMessage(data) {
    Message.call(this, data, Message.prototype.ACKNOWLEDGED_DATA);
  }

  AcknowledgedDataMessage.prototype = Object.create(BroadcastDataMessage.prototype);
  AcknowledgedDataMessage.prototype.constructor = AcknowledgedDataMessage;

  module.exports = AcknowledgedDataMessage;
  
