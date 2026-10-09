'use strict';

class UploadRequest {
  constructor(index, maxFileSize, offset) {
    this.request(index, maxFileSize, offset);
  }

  request(index, maxFileSize, offset) {
    this.index = index || 0;
    this.offset = offset || 0;
    this.maxFileSize = maxFileSize || 0;
  }

// Spec Table 12-13 - its a two packet burst
  serialize() {
  const command = new Uint8Array(16),
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
  }

  toString() {
    return 'UPLOAD REQUEST id 0x' + this.ID.toString(16) + ' index ' + this.index + ' offset ' + this.offset + ' max filesize ' + this.maxFileSize;
  }
}

UploadRequest.prototype.ID = 0x0A;
// "Continue the upload at the last data offset specificed by the client in the Upload Response" Spec. sec. 12.9.1
UploadRequest.prototype.CONTINUE_OFFSET = 0xFFFFFFFF;
UploadRequest.prototype.DIRECTORY = 0x00;
UploadRequest.prototype.COMMAND_PIPE = 0xFFFE;

module.exports = UploadRequest;
