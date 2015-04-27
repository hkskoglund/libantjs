/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

/*jshint -W097 */
'use strict';

function UploadRequest(index, maxFileSize, offset) {
  this.request(index, maxFileSize, offset);
}

UploadRequest.prototype.ID = 0x0A;
// "Continue the upload at the last data offset specificed by the client in the Upload Response" Spec. sec. 12.9.1
UploadRequest.prototype.CONTINUE_OFFSET = 0xFFFFFFFF;

UploadRequest.prototype.DIRECTORY = 0x00;
UploadRequest.prototype.COMMAND_PIPE = 0xFFFE;

UploadRequest.prototype.request = function(index, maxFileSize, offset) {
  this.index = index || 0;
  this.offset = offset || 0;
  this.maxFileSize = maxFileSize || 0;
};

// Spec Table 12-13 - its a two packet burst
UploadRequest.prototype.serialize = function() {
  var command = new Uint8Array(16),
    dv = new DataView(command.buffer);

  // Packet 1

  command[0] = 0x44;                // ANT-FS COMMAND message
  command[1] = this.ID;             // CMD-ID
  dv.setUint16(2, this.index, true);
  dv.setUint32(4, this.maxFileSize, true);

  // Packet 2

  dv.setUint32(8, 0, true);
  dv.setUint32(12, this.offset, true);

  return command;
};

UploadRequest.prototype.toString = function() {
  return 'UPLOAD REQUEST id 0x' + this.ID.toString(16) + ' index ' + this.index + ' offset ' + this.offset + ' max filesize ' + this.maxFileSize;
};

module.exports = UploadRequest;
return module.exports;
