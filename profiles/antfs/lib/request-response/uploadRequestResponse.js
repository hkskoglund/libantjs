/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

/*jshint -W097 */
'use strict';

// Spec; "The host sends an upload request to ready the client device to receive a data upload"
function UploadRequestResponse(data) {

  if (data)
    this.deserialize(data);
}

UploadRequestResponse.prototype.OK                  = 0x00;
UploadRequestResponse.prototype.NOT_EXIST           = 0x01;
UploadRequestResponse.prototype.EXIST_NOT_WRITABLE  = 0x02;
UploadRequestResponse.prototype.NOT_ENOUGH_SPACE    = 0x03;
UploadRequestResponse.prototype.INVALID             = 0x04;
UploadRequestResponse.prototype.NOT_READY           = 0x05;

UploadRequestResponse.prototype.ID = 0x8A;

UploadRequestResponse.prototype.deserialize = function(data) {
// Spec. table 12-15

  var dv = new DataView(data.buffer);

  // PACKET 1 - BEACON stripped off

  // PACKET 2

  // data[0] should be 0x44 ANT-FS RESPONSE/COMMAND
  // data[1] should be 0x8A;

  this.response = data[2];

  // data[3] should be 0x00

  this.offset       = dv.getUint32( 4  + data.byteOffset, true);

  // PACKET 3

  this.maxFileSize  = dv.getUint32( 8  + data.byteOffset, true);
  this.maxBlockSize = dv.getUint32(12  + data.byteOffset, true);

  // PACKET 4

  this.CRC = data[data.byteLength - 1] << 8 | data[data.byteLength - 2];

};

UploadRequestResponse.prototype.toString = function() {

  var msg = 'UPLOAD REQUEST ';

  switch (this.response) {

    case UploadRequestResponse.prototype.OK:
      msg += 'OK';
      break;

    case UploadRequestResponse.prototype.NOT_EXIST:
      msg += 'Does not exist';
      break;

    case UploadRequestResponse.prototype.EXIST_NOT_WRITABLE:
      msg += 'Exists, but is not writable';
      break;

    case UploadRequestResponse.prototype.NOT_READY:
      msg += 'Not ready';
      break;

    case UploadRequestResponse.prototype.INVALID:
      msg += 'Invalid request';
      break;

    case UploadRequestResponse.prototype.NOT_ENOUGH_SPACE:
      msg += 'Not enough space';
      break;
  }

  return msg + ' | Offset ' + this.offset + ' | Max file size ' +    this.maxFileSize +
         ' | Max block size ' + this.maxBlockSize + ' | CRC 16-bit 0x' + this.CRC.toString(16);

};

module.exports = UploadRequestResponse;
return module.exports;
