'use strict';
import BackgroundPage from './background-page.js';



class ProductId extends BackgroundPage {
  constructor(configuration, broadcast, profile, pageNumber) {
    super(configuration, broadcast, profile, pageNumber);
    this.read(broadcast);
  }

  read(broadcast) {
    const data = broadcast.data;
    const dataView = new DataView(data.buffer);

    this.supplementalSWRevision = data[2];
    this.SWRevision = data[3];
    this.SWRevisionString = this.getSWRevision();
    this.serialNumber = dataView.getUint32(data.byteOffset + 4, true);
  }

  getSWRevision() {
    if (this.supplementalSWRevision === 0xFF) {
      return (this.SWRevision / 10).toString();
    }

    return ((this.SWRevision * 100 + this.supplementalSWRevision) / 1000).toString();
  }

  toString() {
    let msg = "P# " + this.number + ' ';
    msg += " SW revision " + this.SWRevisionString;

    if (this.serialNumber === ProductId.NO_SERIAL_NUMBER) {
      msg += " No serial number";
    } else {
      msg += " Serial number " + this.serialNumber;
    }

    return msg;
  }

  static NO_SERIAL_NUMBER = 0xFFFFFFFF;
}



export default ProductId;
