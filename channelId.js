"use strict"

// Function names based on Dynastram Android SDK v 4.00 documentation
function ChannelId(deviceNumber, deviceType, transmissionType, pair) {
    
    this.deviceNumber = deviceNumber;
    this.deviceType = deviceType;
    this.transmissionType = transmissionType;

    if (pair) // Set bit 7 high if pairing is wanted
        this.deviceType = this.deviceType | ChannelId.prototype.BITMASK_PAIR;

    this.pair = (this.deviceType & ChannelId.prototype.BITMASK_PAIR > 0) ? true : false;


   // verify20BitDeviceNumber.bind(this)();
    
}


ChannelId.prototype.getDeviceNumber = function () {
    return this.deviceNumber;
}

ChannelId.prototype.getDeviceType = function () {
    return this.deviceType;
}

ChannelId.prototype.getTransmissionType = function () {
    return this.transmissionType;
}

ChannelId.prototype.getPair = function () {
    return this.pair;
}

// Parse channel ID if enabled via LIBConfig
ChannelId.prototype.parse = function (extendedData) {
    // | DN # af 41 | DT # 78 |T# 01

    this.deviceNumber = extendedData.readUInt16LE(0);
    this.deviceType = extendedData[2];

    // From spec. p. 17 - "an 8-bit field used to define certain transmission characteristics of a device" - shared address, global data pages, 20 bit device number

    this.transmissionType = extendedData[3];

    this.pair = (this.deviceType & ChannelId.prototype.BITMASK_PAIR > 0) ? true : false;

}

//function verify20BitDeviceNumber()
//{
//    // http://www.thisisant.com/developer/resources/tech-bulletin/pairing-to-devices-with-extended-device-numbers
//    // "The extended device number is not intended as a number that must be displayed - it is intended to increase a device's chance of pairing to the right device every time - even in crowded environments."

//    var MSN = (this.transmissionType & 0xF0) >> 4; // Optional extension of the device number 4-bit (Most Significant Nibble)
//    if (MSN) {
//        this.has20BitDeviceNumber = true;
//        this.deviceNumberMSN = MSN;
//        this.deviceNumber = this.deviceNumber & (MSN << 16);
//    }
//}

// Inline with Android Dynastream SDK
ChannelId.prototype.BITMASK_PAIR = parseInt("10000000", 2);
ChannelId.prototype.ANY_DEVICE_NUMBER = 0x00;
ChannelId.prototype.ANY_DEVICE_TYPE = ChannelId.prototype.ANY_DEVICE_NUMBER;
ChannelId.prototype.ANY_TRANSMISSION_TYPE = ChannelId.prototype.ANY_DEVICE_NUMBER;


// Get the 2 least significatiant bit (LSB) of transmission type that determines whether the channel is independent or using 1/2-byte shared address
ChannelId.prototype.getSharedAddressType = function () {
    return this.transmissionType & 0x03;
}

ChannelId.prototype.SHARED_ADDRESS_TYPE = {
    INDEPENDENT_CHANNEL: 0x01,
    ADDRESS_1BYTE: 0x02,
    ADDRESS_2BYTE: 0x03
}

function formatTransmissionType() {
    var msg = "";

    // Bit 0-1 - "indicate the presence, and size, of a shared address field at the beginning of the data payload", spec. p. 17
    switch (this.transmissionType & 0x03) {
       // case 0x00: msg += "Reserved"; break;
        case 0x01: msg += "Independent"; break; // Only one master and one slave participating
        case 0x02: msg += "Shared 1 byte address (if supported)"; break;
        case 0x03: msg += "Shared 2 byte address"; break;
       // default: msg += "?"; break;
    }

    // Bit 2
    if (this.usesANTPLUSGlobalDataPages()) {
       // case 0: msg += " | ANT+ Global data pages not used"; break;
         msg += " | ANT+ Global data pages"; 
       // default: msg += " | ?"; break;
    }

    if (this.has20BitDeviceNumber())
        msg += " | 20-bit D#";

    return msg;
};

ChannelId.prototype.has20BitDeviceNumber = function () {
    return (this.transmissionType & 0xF0) >> 4
}

ChannelId.prototype.usesANTPLUSGlobalDataPages = function () {
    return (this.transmissionType & parseInt("100",2))>>2;
}

ChannelId.prototype.toString = function () {
    
    return "CID 0x" + this.deviceNumber.toString(16) + ",0x" + this.deviceType.toString(16) + ",0x" + this.transmissionType.toString(16) + "," + this.pair + " " + formatTransmissionType.bind(this)()
}

module.exports = ChannelId;