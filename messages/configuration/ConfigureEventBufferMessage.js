/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  'use strict';

  var Message = require('../Message');

  function ConfigureEventBufferMessage(configOrData, size, time) {

    if (configOrData instanceof Uint8Array) // When receiving data
    {
      Message.call(this, configOrData, Message.prototype.EVENT_BUFFER_CONFIGURATION);
    } else {
      Message.call(this, undefined, Message.prototype.EVENT_BUFFER_CONFIGURATION);
      this.encode(configOrData, size, time);

    }

  }

  ConfigureEventBufferMessage.prototype = Object.create(Message.prototype);

  ConfigureEventBufferMessage.prototype.constructor = ConfigureEventBufferMessage;

  ConfigureEventBufferMessage.prototype.BUFFER_LOW_PRIORITY_EVENTS = 0x00; // EVENT_TX,EVENT_RX_FAIL,EVENT_CHANNEL_COLLISION
  ConfigureEventBufferMessage.prototype.BUFFER_ALL_EVENTS = 0x01;
  ConfigureEventBufferMessage.prototype.TIME_DISABLE = 0x00;
  ConfigureEventBufferMessage.prototype.TIME_MAX = 0xFFFF; // Unit : 10ms
  ConfigureEventBufferMessage.prototype.TIME_UNIT = 10;

  ConfigureEventBufferMessage.prototype.encode = function(config, size, time) {
    var msgBuffer = new DataView(new ArrayBuffer(5));

    msgBuffer.setUint8(0, config);
    msgBuffer.setUint16(1, size, true);
    msgBuffer.setUint16(3, time, true);

    this.config = config;
    this.size = size;
    this.time = time;

    this.setContent(msgBuffer);

  };

  ConfigureEventBufferMessage.prototype.decode = function() {
    var dw = new DataView(this.payload.buffer);

    this.config = dw.getUint8(this.payload.byteOffset);
    this.size = dw.getUint16(this.payload.byteOffset + 1, true);
    this.time = dw.getUint16(this.payload.byteOffset + 3, true);

  };

  ConfigureEventBufferMessage.prototype.toString = function() {
    var msg = ' | ';

    if (this.config === ConfigureEventBufferMessage.prototype.BUFFER_LOW_PRIORITY_EVENTS) {
      msg += 'buffer low priority events ';
    } else if (this.config === ConfigureEventBufferMessage.prototype.BUFFER_ALL_EVENTS) {
      msg += 'buffer all events | ';
    } else
      msg += 'buffer unknown priority ' + this.config;

    msg += ' | size ' + this.size + ' bytes before flush';
    msg += ' | time ' + this.time * ConfigureEventBufferMessage.prototype.TIME_UNIT + ' ms';

    return Message.prototype.toString.call(this) + msg;
  };

  module.exports = ConfigureEventBufferMessage;
  return module.exports;
