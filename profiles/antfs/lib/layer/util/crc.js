/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  // Based on ANT-FS PCTOOLS Source Code http://www.thisisant.com/developer/ant/licensing/ant-shared-source-license

  function CRC(data) {

    if (data)
      this.crc16 = this.calc16(data);
    else
      this.crc16 = undefined;
  }

  CRC.prototype.calc16 = function(data) {

    this.crc16 = this.updateCRC16(0, data);

    return this.crc16;
  };

  CRC.prototype.updateCRC16 = function(crcSeed, data) {

    for (var byteNr = 0, len = data.byteLength; byteNr < len; byteNr++)
      crcSeed = this.get16(crcSeed, data[byteNr]);

    return crcSeed;
  };

  CRC.prototype.get16 = function(crcSeed, aByte) {

    var CRC16Table = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
        0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400
      ],
      usTemp;

    // compute checksum of lower four bits of byte

    usTemp = CRC16Table[crcSeed & 0xF];
    crcSeed = (crcSeed >> 4) & 0x0FFF;
    crcSeed = crcSeed ^ usTemp ^ CRC16Table[aByte & 0x0F];

    // now compute checksum of upper four bits of byte

    usTemp = CRC16Table[crcSeed & 0xF];
    crcSeed = (crcSeed >> 4) & 0x0FFF;
    crcSeed = crcSeed ^ usTemp ^ CRC16Table[(aByte >> 4) & 0x0F];

    return crcSeed;

  };

  module.exports = CRC;
  
