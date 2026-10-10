'use strict';

const CRC = require('../layer/util/crc'),
    crc = new CRC();


class UploadDataRequest {
  constructor(crcSeed, offset, data) {
    this.request(crcSeed, offset, data);
  }

  request(crcSeed, offset, data) {
    this.crcSeed = crcSeed || 0;
    this.offset = offset || 0;
    this.data = data;
  }

// Spec. 12.10 - burst: header packet, data packets (padded to 8 bytes) and a footer packet with 6 reserved bytes + CRC
  serialize() {

  const paddedLength = Math.ceil(this.data.byteLength / this.constructor.PACKET_LENGTH) * this.constructor.PACKET_LENGTH,
      command = new Uint8Array(this.constructor.HEADER_LENGTH + paddedLength + this.constructor.FOOTER_LENGTH),
      dv      = new DataView(command.buffer);

  command[0] = 0x44; // ANT-FS COMMAND message
  command[1] = this.constructor.ID;
  dv.setUint16(2, this.crcSeed, true);
  dv.setUint32(4, this.offset, true);

  command.set(this.data, this.constructor.HEADER_LENGTH);

  // CRC covers the data excluding padding (same as for download), continuing from the seed
  this.crc16 = crc.updateCRC16(this.crcSeed, this.data);

  dv.setUint16(command.byteLength - this.constructor.CRC_LENGTH, this.crc16, true);

  return command;
  }

  toString() {
    return this.constructor.name + ' id 0x' + this.constructor.ID.toString(16) + ' offset ' + this.offset +' CRC seed ' + this.crcSeed + ' length ' + this.data.byteLength;
  }

  static ID = 0x0C;
  static HEADER_LENGTH = 8;
  static FOOTER_LENGTH = 8;
  static CRC_LENGTH = 2;
  static PACKET_LENGTH = 8;
}







module.exports = UploadDataRequest;
