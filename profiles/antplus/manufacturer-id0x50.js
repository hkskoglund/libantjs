'use strict';
import BackgroundPage from './background-page.js';



class ManufacturerId extends BackgroundPage {
  constructor(configuration, broadcast, profile, pageNumber) {
    super(configuration, broadcast, profile, pageNumber);
    this.read(broadcast);
  }

  // Background Page 2
  read(broadcast) {
    const data = broadcast.data;
    const dataView = new DataView(data.buffer);

    this.HWRevision = data[3];
    this.manufacturerID = dataView.getUint16(data.byteOffset + 4, true);
    this.manufacturerString = this.getManufacturer(this.manufacturerID) + ' ' + this.manufacturerID;
    this.modelNumber = dataView.getUint16(data.byteOffset + 6, true);
  }

  toString() {
    return " P# " + this.number + " Manufacturer " + this.manufacturerString + ' ' +
      this.manufacturerID + " HW rev. " + this.HWRevision + " Model nr. " + this.modelNumber;
  }
}

export default ManufacturerId;
