'use strict';

const BackgroundPage = require('./background-page');

class ManufacturerId extends BackgroundPage {
  constructor(configuration, broadcast, profile, pageNumber) {
    super(configuration, broadcast, profile, pageNumber);
    this.read(broadcast);
  }

  // Background Page 2
  read(broadcast) {
    const channelId = broadcast.channelId;
    const data = broadcast.data;
    const dataView = new DataView(data.buffer);

    this.manufacturerID = data[1];
    this.manufacturerString = this.getManufacturer(this.manufacturerID) + ' ' + this.manufacturerID;
    this.serialNumber16MSB = dataView.getUint16(data.byteOffset + 2, true);

    if (typeof channelId !== 'undefined' && typeof channelId.deviceNumber !== 'undefined') {
      this.serialNumber = this.serialNumber16MSB * 0x10000 + channelId.deviceNumber;
    } else {
      this.serialNumber = this.serialNumber16MSB;
    }
  }

  toString() {
    return " P# " + this.number + " Manufacturer " + this.manufacturerString + ' ' +
      this.manufacturerID + " serial num. : " + this.serialNumber;
  }
}

module.exports = ManufacturerId;
