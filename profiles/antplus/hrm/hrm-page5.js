'use strict';

  var HRMPage = require('./hrm-page');

  class HRMPage5 extends HRMPage {
  constructor(configuration, broadcast, profile, pageNumber) {


    super(configuration, broadcast, profile, pageNumber);
  }

  readCommonBytes() {

    var data = this.broadcast.data;

    this.intervalAverageHeartRate = data[1];
    this.intervalMaximumHeartRate = data[2];
    this.sessionAverageHeartRate = data[3];
    this.readHR();
  }

  toString() {

    return "P# " + this.number + " Interval average HR " + this.intervalAverageHeartRate +
      " maximum HR " + this.intervalMaximumHeartRate + " session average HR " + this.sessionAverageHeartRate +
      " HR " + this.computedHeartRate;
  }
}








  module.exports = HRMPage5;
