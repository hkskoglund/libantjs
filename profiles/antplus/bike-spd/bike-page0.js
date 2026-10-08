'use strict';

  var SPDCADSharedPage = require('../bike-spdcad/spdcad-shared');

  function BikePage0(configuration, broadcast, profile, pageNumber) {

    SPDCADSharedPage.call(this, configuration, broadcast, profile, pageNumber);

  }

  BikePage0.prototype = Object.create(SPDCADSharedPage.prototype);
  BikePage0.prototype.constructor = BikePage0;

  // ANT Message byte layout - does not conform to ANT+ message format (1 byte datapagenumber/msb page toggle, 7 byte data)
  BikePage0.prototype.BYTE = {

    BIKE_SPEED_EVENT_TIME: 4,
    CUMULATIVE_SPEED_REVOLUTION_COUNT: 6
  };

  BikePage0.prototype.readCommonBytes = function() {
    this.readSpeed();

    if (this.number === 5) {
      this.stopIndicator = (this.broadcast.data[1] & 0x01) === 0x01;
    }
  };

  BikePage0.prototype.update = function() {
    this.calcSpeed();

    if (this.stopIndicator) {
      this.speed = 0;
    }
  };

  BikePage0.prototype.toString = function() {

    var msg;

    msg = "P# " + this.number;

    if (this.speed !== undefined) {
      msg += ' speed (m/s) ' + this.speed;
    }

    if (this.stopIndicator !== undefined) {
      msg += ' stopped ' + this.stopIndicator;
    }

    msg += ' speedEventTime ' + this.bikeSpeedEventTime + ' wheelRevolution ' + this.cumulativeSpeedRevolutionCount +
      ' wheel circumference (m) ' + this.profile.WHEEL_CIRCUMFERENCE;

    return msg;
  };

  module.exports = BikePage0;
  
