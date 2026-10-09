'use strict';

const CumulativeOperatingTimeShared = require('./cumulative-operating-time-shared');

class CumulativeOperatingTime extends CumulativeOperatingTimeShared {
  constructor(configuration, broadcast, profile, pageNumber) {
    super(configuration, broadcast, profile, pageNumber);
    this.readCumulativeOperatingTime(broadcast, 1);
  }

  toString() {
    return "P# " + this.number + " Cumulative operating time  " + this.cumulativeOperatingTimeString;
  }
}

module.exports = CumulativeOperatingTime;
