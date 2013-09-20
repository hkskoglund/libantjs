"use strict";

// Based on ANT-FS PCTOOLS Source Code
// http://www.thisisant.com/developer/ant/licensing/ant-shared-source-license


module.exports.Calc16 = function (data) {
    return module.exports.UpdateCRC16(0, data);
};

module.exports.UpdateCRC16 = function (CRCSeed, data) {
    var byteNr, len = data.length;
    for (byteNr = 0; byteNr < len; byteNr++)
        CRCSeed = module.exports.Get16(CRCSeed, data[byteNr]);
    return CRCSeed;
};

module.exports.Get16 = function (CRCSeed, aByte) {
    var CRC16Table = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
            0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400],
        usTemp;

    // compute checksum of lower four bits of byte 
    usTemp = CRC16Table[CRCSeed & 0xF];
    CRCSeed = (CRCSeed >> 4) & 0x0FFF;
    CRCSeed = CRCSeed ^ usTemp ^ CRC16Table[aByte & 0x0F];

    // now compute checksum of upper four bits of byte 
    usTemp = CRC16Table[CRCSeed & 0xF];
    CRCSeed = (CRCSeed >> 4) & 0x0FFF;
    CRCSeed = CRCSeed ^ usTemp ^ CRC16Table[(aByte >> 4) & 0x0F];

    return CRCSeed;

};

