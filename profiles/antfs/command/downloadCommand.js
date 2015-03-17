/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function DownloadCommand(index,offset,request,crcSeed,maxBlockSize)
  {
      this.indedx = index || 0;
      this.offset = offset || 0;
      this.request = request || DownloadCommand.prototype.NEW_TRANSFER;
      this.crcSeed = crcSeed || 0;
      this.maxBlockSize = maxBlockSize || 0; // 0 = "host do not wish to limit the block size"

  }

  DownloadCommand.prototype.CONTINUE_TRANSFER = 0x00;
  DownloadCommand.prototype.NEW_TRANSFER = 0x01;

  DownloadCommand.prototype.ID = 0x09;

  // Spec 12.7 Downloading - its a two packet burst
  DownloadCommand.prototype.serialize = function ()
  {
      var command = new Uint8Array(16),
          dv = new DataView(command.buffer);

      command[0] = 0x44; // ANT-FS COMMAND message
      command[1] = this.ID;
      dv.setUint16(2,this.index,true);
      dv.setUint32(4,this.offset,true);
      command[8] = 0;
      command[9] = this.request;
      dv.setUint16(10,this.crcSeed,true);
      dv.setUint32(12,this.maxBlockSize,true);

      return command;
  };

  module.exports = DownloadCommand;
  return module.exports;

});
