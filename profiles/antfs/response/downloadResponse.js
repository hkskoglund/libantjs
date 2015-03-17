/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function DownloadResponse(data)
  {
    if (data)
      this.deserialize(data);
  }

  DownloadResponse.prototype.OK = 0x00;
  DownloadResponse.prototype.NOT_EXIST = 0x01;
  DownloadResponse.prototype.EXIST_NOT_DOWNLOADABLE = 0x02;
  DownloadResponse.prototype.NOT_READY_TO_DOWNLOAD = 0x03;
  DownloadResponse.prototype.INVALID = 0x04;
  DownloadResponse.prototype.CRC_INCORRECT = 0x05;

  DownloadResponse.prototype.ID = 0x89;

  DownloadResponse.prototype.HEADER_LENGTH = 16;
  DownloadResponse.prototype.FOOTER_LENGTH = 8;
  DownloadResponse.prototype.CRC_LENGTH = 2;

  DownloadResponse.prototype.deserialize = function (data)
  {

      var dv = new DataView(data.buffer);

      // HEADER

      // data[0] should be 0x44 ANT-FS RESPONSE/COMMAND
      // data[1] should be 0x84;

      this.response = data[2];

      // data[3] should be 0x00

      this.length = dv.getUint32(4+data.byteOffset,true);
      this.offset = dv.getUint32(8+data.byteOffset,true);
      this.fileSize = dv.getUint32(12+data.byteOffset,true);

      // DATA

      this.packets = data.subarray(DownloadResponse.prototype.HEADER_LENGTH,-DownloadResponse.prototype.FOOTER_LENGTH);

      // FOOTER

      this.CRC = dv.getUint16(data.buffer.byteLength-DownloadResponse.prototype.CRC_LENGTH,true);

  };

  DownloadResponse.prototype.toString = function ()
  {

    var msg = '';

    switch (this.response)
    {
      case DownloadResponse.prototype.OK : msg += 'Request OK'; break;
      case DownloadResponse.prototype.NOT_EXIST : msg += 'Does not exist'; break;
      case DownloadResponse.prototype.EXIST_NOT_DOWNLOADABLE : msg += 'Exists, but is not downloadable'; break;
      case DownloadResponse.prototype.NOT_READY_TO_DOWNLOAD : msg += 'Not ready to download'; break;
      case DownloadResponse.prototype.INVALID : msg += 'Invalid request'; break;
      case DownloadResponse.prototype.CRC_INCORRECT : msg += 'CRC incorrect'; break;
    }

    return msg + ' | Length ' + this.length+' | Offset ' + this.offset + ' | Size ' +
           this.fileSize + ' | CRC 16-bit 0x' + this.CRC.toString(16);

  };

  module.exports = DownloadResponse;
  return module.exports;

});
