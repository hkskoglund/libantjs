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

  static getDeviceTypeName(deviceType) {
    return ChannelId.DEVICE_TYPE_NAMES[deviceType & ~ChannelId.BITMASK.DEVICE_TYPE.PAIR];
  }

  static describeTransmissionType(transmissionType) {
    const details = [];
    const sharedAddressType = transmissionType & ChannelId.BITMASK.TRANSMISSION_TYPE.SHARED_ADDRESS;

    if (sharedAddressType === ChannelId.SHARED_ADDRESS_TYPE.INDEPENDENT_CHANNEL)
      details.push('independent channel');
    else if (sharedAddressType === ChannelId.SHARED_ADDRESS_TYPE.ADDRESS_1BYTE)
      details.push('shared 1-byte address');
    else if (sharedAddressType === ChannelId.SHARED_ADDRESS_TYPE.ADDRESS_2BYTE)
      details.push('shared 2-byte address');

    if (transmissionType & ChannelId.BITMASK.TRANSMISSION_TYPE.ANTPLUS_GLOBAL_PAGES)
      details.push('global data pages enabled');

    const deviceNumberExtension = (transmissionType &
      ChannelId.BITMASK.TRANSMISSION_TYPE.BIT20_ADDRESS_NIBBLE) >> 4;
    if (deviceNumberExtension)
      details.push('20-bit device number extension ' + deviceNumberExtension);

    return details.length
      ? details.join(', ') + ' (0x' + transmissionType.toString(16).padStart(2, '0') + ')'
      : 'no additional transmission features (0x' + transmissionType.toString(16).padStart(2, '0') + ')';
  }

  toString() {

    const details = [
      "Device " + this.deviceNumber,
      "type " + (ChannelId.getDeviceTypeName(this.deviceType) || (this.deviceType & ~ChannelId.BITMASK.DEVICE_TYPE.PAIR)),
      this.pair ? "pairing requested" : "pairing not requested"
    ];
    const sharedAddressType = this.getSharedAddressType();

    if (sharedAddressType === ChannelId.SHARED_ADDRESS_TYPE.INDEPENDENT_CHANNEL)
      details.push("independent channel");
    else if (sharedAddressType === ChannelId.SHARED_ADDRESS_TYPE.ADDRESS_1BYTE)
      details.push("shared 1-byte address");
    else if (sharedAddressType === ChannelId.SHARED_ADDRESS_TYPE.ADDRESS_2BYTE)
      details.push("shared 2-byte address");

    details.push(this.hasGlobalDataPages() ? "global data pages enabled" : "global data pages disabled");

    if (this.has20BitDeviceNumber())
      details[0] += " (20-bit " + this.deviceNumber20BIT + ")";

    return details.join(", ");
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
  static DEVICE_TYPE_NAMES = {
    0x0B: 'Bike Power',
    0x19: 'Environment',
    0x78: 'Heart Rate',
    0x79: 'Bike Speed/Cadence',
    0x7A: 'Bike Cadence',
    0x7B: 'Bike Speed',
    0x7C: 'Stride-Based Speed and Distance'
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

export default ChannelId;
