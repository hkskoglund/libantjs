/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  function DownloadRequest(index, offset, initialRequest, crcSeed, maxBlockSize) {
    this.request(index, offset, initialRequest, crcSeed, maxBlockSize);
  }

  DownloadRequest.prototype.CONTINUE_TRANSFER = 0x00;
  DownloadRequest.prototype.NEW_TRANSFER = 0x01;

  DownloadRequest.prototype.ID = 0x09;

  DownloadRequest.prototype.FILE_INDEX = {
    DIRECTORY: 0x00,
    COMMAND_PIPE: 0xFFFE
  };

  DownloadRequest.prototype.setMaxBlockSize = function(maxBlockSize) {
    this.maxBlockSize = maxBlockSize;
  };

  DownloadRequest.prototype.continueRequest = function(index, offset, crcSeed, maxBlockSize) {
    this.request(index, offset, DownloadRequest.prototype.CONTINUE_TRANSFER, crcSeed, maxBlockSize);
  };

  DownloadRequest.prototype.request = function(index, offset, initialRequest, crcSeed, maxBlockSize) {
    this.index = index || 0;
    this.offset = offset || 0;

    if (initialRequest === undefined)
      initialRequest = DownloadRequest.prototype.NEW_TRANSFER;

    this.initialRequest = initialRequest;
    this.crcSeed = crcSeed || 0;
    this.maxBlockSize = maxBlockSize || 0; // 0 = "host do not wish to limit the block size"
  };

  // Spec 12.7 Downloading - its a two packet burst
  DownloadRequest.prototype.serialize = function() {
    var command = new Uint8Array(16),
      dv = new DataView(command.buffer);

    command[0] = 0x44; // ANT-FS COMMAND message
    command[1] = this.ID;
    dv.setUint16(2, this.index, true);
    dv.setUint32(4, this.offset, true);
    command[8] = 0;
    command[9] = this.initialRequest;
    dv.setUint16(10, this.crcSeed, true);
    dv.setUint32(12, this.maxBlockSize, true);

    return command;
  };

  DownloadRequest.prototype.toString = function() {
    return 'DOWNLOAD index ' + this.index + ' offset ' + this.offset + ' initial request ' +
      this.initialRequest + ' CRC seed ' + this.crcSeed + ' max blocksize ' + this.maxBlockSize;
  };

  module.exports = DownloadRequest;
  return module.exports;
