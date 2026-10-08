'use strict';

  var HRMPage = require('./HRMPage');

  function HRMPage5(configuration, broadcast, profile, pageNumber) {

    HRMPage.call(this, configuration, broadcast, profile, pageNumber);

  }

  HRMPage5.prototype = Object.create(HRMPage.prototype);
  HRMPage5.prototype.constructor = HRMPage5;

  HRMPage5.prototype.readCommonBytes = function() {
    var data = this.broadcast.data;

    this.intervalAverageHeartRate = data[1];
    this.intervalMaximumHeartRate = data[2];
    this.sessionAverageHeartRate = data[3];
    this.readHR();
  };

  HRMPage5.prototype.toString = function() {
    return "P# " + this.number + " Interval average HR " + this.intervalAverageHeartRate +
      " maximum HR " + this.intervalMaximumHeartRate + " session average HR " + this.sessionAverageHeartRate +
      " HR " + this.computedHeartRate;
  };

  module.exports = HRMPage5;
