/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  function DownloadResponse(data) {
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
  DownloadResponse.prototype.FOOTER_RESERVED_PAD_LENGTH = 6;
  DownloadResponse.prototype.CRC_LENGTH = 2;
  DownloadResponse.prototype.PACKET_LENGTH = 8;

  DownloadResponse.prototype.deserialize = function(data) {
    // overview p. 59 in spec of response format

    var dv = new DataView(data.buffer),
      iStart,
      iEnd;

    // HEADER

    // data[0] should be 0x44 ANT-FS RESPONSE/COMMAND
    // data[1] should be 0x84;

    this.result = data[2];

    // data[3] should be 0x00

    this.length = dv.getUint32(4 + data.byteOffset, true);
    this.offset = dv.getUint32(8 + data.byteOffset, true);
    this.fileSize = dv.getUint32(12 + data.byteOffset, true);

    // DATA

    iStart = DownloadResponse.prototype.HEADER_LENGTH;
    iEnd = DownloadResponse.prototype.HEADER_LENGTH + this.length; // we are optimistic and trust length

    this.packets = data.subarray(iStart, iEnd);

    // FOOTER

    this.CRC = data[data.byteLength - 1] << 8 | data[data.byteLength - 2];

  };

  DownloadResponse.prototype.toString = function() {

    var msg = 'DOWNLOAD ';

    switch (this.result) {

      case DownloadResponse.prototype.OK:
        msg += 'OK';
        break;

      case DownloadResponse.prototype.NOT_EXIST:
        msg += 'Does not exist';
        break;

      case DownloadResponse.prototype.EXIST_NOT_DOWNLOADABLE:
        msg += 'Exists, but is not downloadable';
        break;

      case DownloadResponse.prototype.NOT_READY_TO_DOWNLOAD:
        msg += 'Not ready to download';
        break;

      case DownloadResponse.prototype.INVALID:
        msg += 'Invalid request';
        break;

      case DownloadResponse.prototype.CRC_INCORRECT:
        msg += 'CRC incorrect';
        break;
    }

    return msg + ' | Length ' + this.length + ' | Offset ' + this.offset + ' | Size ' +
      this.fileSize + ' | CRC 16-bit 0x' + this.CRC.toString(16);

  };

  module.exports = DownloadResponse;
  return module.exports;
