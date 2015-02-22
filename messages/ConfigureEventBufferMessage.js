/* global define: true, DataView: true, ArrayBuffer: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

  'use strict';

  var Message = require('./Message');

  function ConfigureEventBufferMessage(config,size,time)  {

      Message.call(this,undefined,Message.prototype.MESSAGE.EVENT_BUFFER_CONFIGURATION);
      this.encode(config,size,time);

  }

  ConfigureEventBufferMessage.prototype.BUFFER_LOW_PRIORITY_EVENTS = 0x00; // EVENT_TX,EVENT_RX_FAIL,EVENT_CHANNEL_COLLISION
  ConfigureEventBufferMessage.prototype.BUFFER_ALL_EVENTS = 0x01;
  ConfigureEventBufferMessage.prototype.TIME_DISABLE = 0x00;
  ConfigureEventBufferMessage.prototype.TIME_MAX = 0xFFFF; // Unit : 10ms
  ConfigureEventBufferMessage.prototype.TIME_UNIT = 10;

  ConfigureEventBufferMessage.prototype = Object.create(Message.prototype);

  ConfigureEventBufferMessage.prototype.constructor = ConfigureEventBufferMessage;

  ConfigureEventBufferMessage.prototype.encode = function (config,size,time)  {
    var msgBuffer = new DataView(new ArrayBuffer(5));

    msgBuffer.setUint8(0,config);
    msgBuffer.setUint16(1,size, true);
    msgBuffer.setUint16(3,time,true);

    this.config= config;
    this.size = size;
    this.time = time;

    this.setContent(msgBuffer.buffer);

  };

  ConfigureEventBufferMessage.prototype.toString = function ()  {
      var msg = '';

      if (this.config === ConfigureEventBufferMessage.prototype.BUFFER_LOW_PRIORITY_EVENTS)
      {
        msg += 'buffer low priority events';
      } else if (this.config === ConfigureEventBufferMessage.prototype.BUFFER_ALL_EVENTS)
      {
        msg += 'buffer all events';
      } else
        msg += 'buffer unknown priority '+this.config;

      msg += ' size '+this.size+' bytes before flush';
      msg += ' time '+this.time*ConfigureEventBufferMessage.prototype.TIME_UNIT+' ms';

      return Message.prototype.toString() ;
  };

  module.exports = ConfigureEventBufferMessage;
  return module.exports;
});
