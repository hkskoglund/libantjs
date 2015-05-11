/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

/*jshint -W097 */
'use strict';

var crc = new require('../layer/util/crc')();


function UploadDataRequest(crcSeed, offset, data) {
  this.request(crcSeed, offset, data);
}

UploadDataRequest.prototype.ID = 0x0C;

UploadDataRequest.prototype.CONTINUE_TRANSFER = 0x00;
UploadDataRequest.prototype.NEW_TRANSFER      = 0x01;

UploadDataRequest.prototype.DIRECTORY     = 0x00;
UploadDataRequest.prototype.COMMAND_PIPE  = 0xFFFE;

UploadDataRequest.prototype.HEADER_LENGTH              = 8;
UploadDataRequest.prototype.FOOTER_LENGTH              = 8;
UploadDataRequest.prototype.FOOTER_RESERVED_PAD_LENGTH = 6;
UploadDataRequest.prototype.CRC_LENGTH                 = 2;
UploadDataRequest.prototype.PACKET_LENGTH              = 8;

UploadDataRequest.prototype.continueRequest = function(index, offset, crcSeed, maxBlockSize) {
  this.request(index, offset, UploadDataRequest.prototype.CONTINUE_TRANSFER, crcSeed, maxBlockSize);
};

UploadDataRequest.prototype.request = function(crcSeed, offset, data) {

  this.crcSeed = crcSeed || 0;
  this.offset = offset || 0;
  this.data = data;
};

UploadDataRequest.prototype.serialize = function() {

  var command = new Uint8Array(this.HEADER_LENGTH + this.data.byteLength + this.FOOTER_LENGTH),
      dv      = new DataView(command.buffer);



 // PACKET 1 - HEADER

  command[0] = 0x44; // ANT-FS COMMAND message
  command[1] = this.ID;
  dv.setUint16(2, this.crcSeed, true);
  dv.setUint32(4, this.offset, true);

  // PACKET 2:N - DATA PACKETS

  command.set(this.data, this.HEADER_LENGTH);

  // PACKET N + 1 - FOOTER

  // 6 zeros
  dv.setUint16(command.byteLength - this.CRC_LENGTH, this.crc16, true);

  return command;
};

UploadDataRequest.prototype.toString = function() {
  return this.constructor.name + ' id 0x' + this.ID.toString(16) + ' offset ' + this.offset +' CRC seed ' + this.crcSeed;
};

module.exports = UploadDataRequest;

