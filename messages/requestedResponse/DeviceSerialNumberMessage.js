/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  'use strict';

  var Message = require('../Message');

  function DeviceSerialNumberMessage(data) {
    Message.call(this, data);
  }

  DeviceSerialNumberMessage.prototype = Object.create(Message.prototype);

  DeviceSerialNumberMessage.prototype.constructor = DeviceSerialNumberMessage;

  DeviceSerialNumberMessage.prototype.decode = function() {
    // SN 4 bytes Little Endian
    var dw = new DataView((new Uint8Array([this.content[0], this.content[1], this.content[2], this.content[3]])).buffer);

    this.serialNumber = dw.getUint32(0, true);
    this.serialNumberAsChannelId = dw.getUint16(0, true); // Lower 2-bytes
  };

  DeviceSerialNumberMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + " " + this.serialNumber + ' (0x' + this.serialNumber.toString(16) + ')' + " lower 2-bytes " + this.serialNumberAsChannelId + ' (0x' + this.serialNumberAsChannelId.toString(16) + ')';
  };

  module.exports = DeviceSerialNumberMessage;
  return module.exports;
