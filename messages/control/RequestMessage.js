/* global define: true, Uint8Array: true, DataView: true, ArrayBuffer: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

  'use strict';

  var Message = require('../Message');

  // p.89 "ANT Message Protocol and Usage, rev 5.0b"
  // "Valid messages include channel status, channel ID, ANT version, capabilities, event buffer, advanced burst capabilitites/configuration, event filter, and user NVM
  function RequestMessage(channel, requestedMessageId, NVMaddr, NVMsize){

      Message.call(this,undefined,Message.prototype.REQUEST);
      this.encode(channel, requestedMessageId, NVMaddr, NVMsize);

  }

  RequestMessage.prototype = Object.create(Message.prototype);

  RequestMessage.prototype.constructor = RequestMessage;

  RequestMessage.prototype.encode = function (channel, requestedMessageId, NVMaddr, NVMsize)
  {
    var msgBuffer = new Uint8Array([channel || 0, requestedMessageId]);

    this.requestId = requestedMessageId;

    this.channel = channel || 0;

    // Non Volatile Memory

    if (typeof NVMaddr !== "undefined" && typeof NVMsize !== "undefined"){
        var NVM_Buffer;
        this.NVMaddr = NVMaddr;
        this.NVMsize = NVMsize;

        NVM_Buffer = new DataView(new ArrayBuffer(3));
        NVM_Buffer.setUint16(0,NVMaddr,true); // Little endian
        NVM_Buffer.setUint8(2, NVMsize);

        msgBuffer = new Uint8Array([channel || 0, requestedMessageId,0,0,0]);
        msgBuffer.set(new Uint8Array(NVM_Buffer.buffer),2);

    }

    this.setContent(msgBuffer.buffer);


  };

  RequestMessage.prototype.toString = function (){
      var msg = Message.prototype.toString.call(this) + " Ch " + this.channel + " ID 0x" + this.requestId.toString(16)+' '+Message.prototype.MESSAGE[this.requestId];
      if (this.NVMaddr)
          msg += " NVMaddr " + this.NVMaddr;
      if (this.NVMsize)
          msg += " NVMsize " + this.NVMsize;

      return msg;

  };

  module.exports = RequestMessage;
      return module.exports;
});
