'use strict';
import BackgroundPage from './background-page.js';



class ProductId extends BackgroundPage {
  constructor(configuration, broadcast, profile, pageNumber) {
    super(configuration, broadcast, profile, pageNumber);
    this.read(broadcast);
  }

  // Background Page 3
  read(broadcast) {
    const data = broadcast.data;
    this.hardwareVersion = data[1];
    this.softwareVersion = data[2];
    this.modelNumber = data[3];
  }

  toString() {
    return " P# " + this.number + " HW ver. " + this.hardwareVersion +
      " SW ver. " + this.softwareVersion + " Model " + this.modelNumber;
  }
}

export default ProductId;
