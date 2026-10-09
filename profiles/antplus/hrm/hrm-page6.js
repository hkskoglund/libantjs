'use strict';

const BackgroundPage = require('../background-page');

class HRMPage6 extends BackgroundPage {
  constructor(configuration, broadcast, profile, pageNumber) {
    super(configuration, broadcast, profile, pageNumber);
    this.read(broadcast);
  }

  read(broadcast) {
    const data = broadcast.data;

    this.featuresSupported = data[2];
    this.featuresEnabled = data[3];
    this.supported = {
      extendedRunning: (this.featuresSupported & 0x01) !== 0,
      extendedCycling: (this.featuresSupported & 0x02) !== 0,
      extendedSwimming: (this.featuresSupported & 0x04) !== 0,
      gymMode: (this.featuresSupported & 0x08) !== 0,
      manufacturerSpecific: (this.featuresSupported >> 6) & 0x03
    };
    this.enabled = {
      extendedRunning: (this.featuresEnabled & 0x01) !== 0,
      extendedCycling: (this.featuresEnabled & 0x02) !== 0,
      extendedSwimming: (this.featuresEnabled & 0x04) !== 0,
      gymMode: (this.featuresEnabled & 0x08) !== 0,
      manufacturerSpecific: (this.featuresEnabled >> 6) & 0x03
    };
  }

  toString() {
    return "P# " + this.number + " Features supported 0x" + this.featuresSupported.toString(16) +
      " enabled 0x" + this.featuresEnabled.toString(16);
  }
}

module.exports = HRMPage6;
