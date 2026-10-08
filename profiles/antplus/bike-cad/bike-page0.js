'use strict';

  var SPDCADSharedPage = require('../bike-spdcad/spdcad-shared');

  function BikePage0(configuration, broadcast, profile, pageNumber) {

    SPDCADSharedPage.call(this, configuration, broadcast, profile, pageNumber);


  }

  BikePage0.prototype = Object.create(SPDCADSharedPage.prototype);
  BikePage0.prototype.constructor = BikePage0;

  // ANT Message byte layout - does not conform to ANT+ message format (1 byte datapagenumber/msb page toggle, 7 byte data)
  BikePage0.prototype.BYTE = {

    BIKE_CADENCE_EVENT_TIME: 4,
    CUMULATIVE_CADENCE_REVOLUTION_COUNT: 6
  };

  BikePage0.prototype.readCommonBytes = function() {
    this.readCadence();

    if (this.number === 5) {
      this.stopIndicator = (this.broadcast.data[1] & 0x01) === 0x01;
    }
  };

  BikePage0.prototype.update = function() {
    this.calcCadence();

    if (this.stopIndicator) {
      this.cadence = 0;
    }
  };

  BikePage0.prototype.toString = function() {

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
  };

  module.exports = BikePage0;
  
