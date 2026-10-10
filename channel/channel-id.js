'use strict';
// Function names based on Dynastram Android SDK v 4.00 documentation

class ChannelId {
  constructor(deviceNumber, deviceType, transmissionType, pair) {

    // Allow for new ChannelId(), when parsing broadcast data
    if (arguments.length === 0) {
      return;
    }

    this.deviceNumber = deviceNumber;
    this.deviceType = deviceType;
    this.transmissionType = transmissionType;

    if (pair) // Set bit 7 high if pairing is wanted
    {
      this.deviceType = this.deviceType | ChannelId.BITMASK.DEVICE_TYPE.PAIR;
    }

    this.pair = ((this.deviceType & ChannelId.BITMASK.DEVICE_TYPE.PAIR) > 0);

    // http://www.thisisant.com/developer/resources/tech-bulletin/pairing-to-devices-with-extended-device-numbers
    // "The extended device number is not intended as a number that must be displayed - it is intended to increase a device's chance of pairing to the right device every time - even in crowded environments."

    this._check20BitDeviceNumber();
  }

  _check20BitDeviceNumber() {

    var transferTypeMSN;

    delete this.deviceNumber20BIT;

    if (this.has20BitDeviceNumber()) {
      transferTypeMSN = (this.transmissionType & ChannelId.BITMASK.TRANSMISSION_TYPE.BIT20_ADDRESS_NIBBLE) >> ChannelId.BIT_FIELD.TRANSMISSION_TYPE.BIT20_ADDRESS_NIBBLE.start_bit;
      this.deviceNumber20BIT = (transferTypeMSN << 16) | this.deviceNumber;
    }
  }

  getUniqueId(networkNr, channelNr) {

    var pageScheme = 'ant';

    pageScheme = pageScheme + ':' + networkNr + '.' + channelNr + ':' + this.deviceNumber + '.' + this.deviceType + '.' + this.transmissionType;

    return pageScheme;
  }

  getDeviceNumber() {

    return this.deviceNumber;
  }

  getDeviceType() {

    return this.deviceType;
  }

  getTransmissionType() {

    return this.transmissionType;
  }

  getPair() {

    return this.pair;
  }

  decode(extendedData) {

    if (!extendedData || extendedData.length < 4) {
      throw new RangeError('Channel ID data must contain at least 4 bytes');
    }

    // | DN # af 41 | DT # 78 |T# 01

    this.deviceNumber = (new DataView(extendedData.buffer, extendedData.byteOffset, extendedData.byteLength)).getUint16(0, true);

    this.deviceType = extendedData[2];

    // From spec. p. 17 - "an 8-bit field used to define certain transmission characteristics of a device" - shared address, global data pages, 20 bit device number

    this.transmissionType = extendedData[3];

    this.pair = ((this.deviceType & ChannelId.BITMASK.DEVICE_TYPE.PAIR) > 0);

    this._check20BitDeviceNumber();

    this.globalDataPagesNonANTPlusManaged = this.hasGlobalDataPages();
  }

  getSharedAddressType() {

    return this.transmissionType & ChannelId.BITMASK.TRANSMISSION_TYPE.SHARED_ADDRESS;
  }

  has20BitDeviceNumber() {

    return (this.transmissionType & ChannelId.BITMASK.TRANSMISSION_TYPE.BIT20_ADDRESS_NIBBLE) >> ChannelId.BIT_FIELD.TRANSMISSION_TYPE.BIT20_ADDRESS_NIBBLE.start_bit;
  }

  hasGlobalDataPages() {

    return (this.transmissionType & ChannelId.BITMASK.TRANSMISSION_TYPE.ANTPLUS_GLOBAL_PAGES) >> ChannelId.BIT_FIELD.TRANSMISSION_TYPE.ANTPLUS_GLOBAL_PAGES.start_bit;
  }

  toString() {

    var formatTransmissionType = function() {
      var msg = "";

      // Bit 0-1 - "indicate the presence, and size, of a shared address field at the beginning of the data payload", spec. p. 17
      switch (this.transmissionType & ChannelId.BITMASK.TRANSMISSION_TYPE.SHARED_ADDRESS) {
        // case 0x00: msg += "Reserved"; break;
        case 0x01:
          msg += "Independent";
          break; // Only one master and one slave participating
        case 0x02:
          msg += "Shared 1 byte address (if supported)";
          break;
        case 0x03:
          msg += "Shared 2 byte address";
          break;
          // default: msg += "?"; break;
      }

      // Bit 2
      if (this.hasGlobalDataPages()) {
        // case 0: msg += " | ANT+ Global data pages not used"; break;
        msg += " | Global datapages";
        // default: msg += " | ?"; break;
      }

      if (this.has20BitDeviceNumber()) {
        msg += " | 20-bit D# = 0x" + this.deviceNumber20BIT.toString(16);
      }

      return msg;

    }.bind(this);

    return "Id 0x" + this.deviceNumber.toString(16) + ",0x" + this.deviceType.toString(16) + ",0x" + this.transmissionType.toString(16) + "," + this.pair + " " + formatTransmissionType();
  }

  static BITMASK = {
  DEVICE_TYPE: {
    PAIR: parseInt("10000000", 2)
  },
  TRANSMISSION_TYPE: {
    SHARED_ADDRESS: parseInt("11", 2),
    ANTPLUS_GLOBAL_PAGES: parseInt("100", 2),
    BIT20_ADDRESS_NIBBLE: parseInt("11110000", 2)
  },
};
  static BIT_FIELD = {
  TRANSMISSION_TYPE: {
    ANTPLUS_GLOBAL_PAGES: {
      start_bit: 2,
      length: 1
    },

    BIT20_ADDRESS_NIBBLE: {
      start_bit: 4,
      length: 4
    }

  }
};
  static ANY_DEVICE_NUMBER = 0x00;
  static ANY_DEVICE_TYPE = ChannelId.ANY_DEVICE_NUMBER;
  static ANY_TRANSMISSION_TYPE = ChannelId.ANY_DEVICE_NUMBER;
  static SHARED_ADDRESS_TYPE = {
  INDEPENDENT_CHANNEL: 0x01,
  ADDRESS_1BYTE: 0x02,
  ADDRESS_2BYTE: 0x03
};
}









// Parse channel ID if enabled via LIBConfig

// Get the 2 least significatiant bit (LSB) of transmission type that determines whether the channel is independent or using 1/2-byte shared address



// ANT Message Protocol and Usage, Rev. 5.1, p. 18
// "the thrid LSB is used to indicate the precence of a Global Data Identification Byte (such as ANT+ page numbers)"
// Optional bit for non-ANT+ managed networks: table 5-2

module.exports = ChannelId;

