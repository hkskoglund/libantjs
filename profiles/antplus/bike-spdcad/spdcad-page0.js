'use strict';

  var SPDCADSharedPage = require('../bike-spdcad/spdcad-shared');

  class SPDCADPage0 extends SPDCADSharedPage {
  constructor(configuration, broadcast, profile, pageNumber) {


    super(configuration, broadcast, profile, pageNumber, 64000);
  }

  readCommonBytes() {

    this.readCadence();
    this.readSpeed();
  }

  update() {


    this.calcSpeed();
    this.calcCadence();
  }

  toString() {


    var msg;

    msg = "P# " + this.number + " cadence (rpm) ";

    if (this.cadence !== undefined) {
      msg += this.cadence;
    }

    msg += " cadenceEventTime " + this.bikeCadenceEventTime + ' cadenceRevolution ' + this.cumulativeCadenceRevolutionCount;

    if (this.speed !== undefined) {
      msg += ' speed (m/s) ' + this.speed;
    }

    msg += ' speedEventTime ' + this.bikeSpeedEventTime + ' wheelRevolution ' + this.cumulativeSpeedRevolutionCount +
      ' wheel circumference (m) ' + this.profile.WHEEL_CIRCUMFERENCE;


    return msg;
  }
}




  // ANT Message byte layout - does not conform to ANT+ message format (1 byte datapagenumber/msb page toggle, 7 byte data)
  SPDCADPage0.prototype.BYTE = {
    BIKE_CADENCE_EVENT_TIME: 0,
    CUMULATIVE_CADENCE_REVOLUTION_COUNT: 2,
    BIKE_SPEED_EVENT_TIME: 4,
    CUMULATIVE_SPEED_REVOLUTION_COUNT: 6
  };







  module.exports = SPDCADPage0;

