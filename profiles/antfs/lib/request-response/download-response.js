'use strict';

class DownloadResponse {
  constructor(data) {
    if (data)
      this.deserialize(data);
  }

  deserialize(data) {
    // overview p. 59 in spec of response format

    let dv = new DataView(data.buffer),
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

    iStart = DownloadResponse.HEADER_LENGTH;
    iEnd = DownloadResponse.HEADER_LENGTH + this.length; // we are optimistic and trust length

    this.packets = data.subarray(iStart, iEnd);

    // FOOTER

    this.CRC = data[data.byteLength - 1] << 8 | data[data.byteLength - 2];

  }

  toString() {
    return this.constructor.name + ' | Length ' + this.length + ' | Offset ' + this.offset + ' | Size ' +
      this.fileSize + ' | CRC 16-bit 0x' + this.CRC.toString(16);

  }

  static OK = 0x00;
  static NOT_EXIST = 0x01;
  static EXIST_NOT_DOWNLOADABLE = 0x02;
  static NOT_READY = 0x03;
  static INVALID = 0x04;
  static CRC_INCORRECT = 0x05;
  static ID = 0x89;
  static HEADER_LENGTH = 16;
  static FOOTER_LENGTH = 8;
  static FOOTER_RESERVED_PAD_LENGTH = 6;
  static CRC_LENGTH = 2;
  static PACKET_LENGTH = 8;
}














  module.exports = DownloadResponse;

