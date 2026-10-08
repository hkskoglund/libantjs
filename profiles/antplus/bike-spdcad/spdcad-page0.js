'use strict';

  var SPDCADSharedPage = require('../bike-spdcad/spdcad-shared');

  function SPDCADPage0(configuration, broadcast, profile, pageNumber) {

    SPDCADSharedPage.call(this, configuration, broadcast, profile, pageNumber, 64000);


  }

  SPDCADPage0.prototype = Object.create(SPDCADSharedPage.prototype);
  SPDCADPage0.prototype.constructor = SPDCADPage0;

  // ANT Message byte layout - does not conform to ANT+ message format (1 byte datapagenumber/msb page toggle, 7 byte data)
  SPDCADPage0.prototype.BYTE = {
    BIKE_CADENCE_EVENT_TIME: 0,
    CUMULATIVE_CADENCE_REVOLUTION_COUNT: 2,
    BIKE_SPEED_EVENT_TIME: 4,
    CUMULATIVE_SPEED_REVOLUTION_COUNT: 6
  };

  SPDCADPage0.prototype.readCommonBytes = function() {
    this.readCadence();
    this.readSpeed();
  };

  SPDCADPage0.prototype.update = function() {

    this.calcSpeed();
    this.calcCadence();

  };

  SPDCADPage0.prototype.toString = function() {

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
  };

  module.exports = SPDCADPage0;
  
