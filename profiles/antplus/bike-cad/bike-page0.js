'use strict';
import SPDCADSharedPage from '../bike-spdcad/spdcad-shared.js';



  class BikePage0 extends SPDCADSharedPage {
  constructor(configuration, broadcast, profile, pageNumber) {


    super(configuration, broadcast, profile, pageNumber);
  }

  readCommonBytes() {

    this.readCadence();

    if (this.number === 5) {
      this.stopIndicator = (this.broadcast.data[1] & 0x01) === 0x01;
    }
  }

  update() {

    this.calcCadence();

    if (this.stopIndicator) {
      this.cadence = 0;
    }
  }

  toString() {


    var msg;

    msg = "P# " + this.number + " cadence (rpm) ";

    if (this.cadence !== undefined) {
      msg += this.cadence;
    }

    if (this.stopIndicator !== undefined) {
      msg += ' stopped ' + this.stopIndicator;
    }

    msg += " cadenceEventTime " + this.bikeCadenceEventTime + ' cadenceRevolution ' + this.cumulativeCadenceRevolutionCount;


    return msg;
  }

  static BYTE = {

    BIKE_CADENCE_EVENT_TIME: 4,
    CUMULATIVE_CADENCE_REVOLUTION_COUNT: 6
  };
}




  // ANT Message byte layout - does not conform to ANT+ message format (1 byte datapagenumber/msb page toggle, 7 byte data)








  export default BikePage0;

