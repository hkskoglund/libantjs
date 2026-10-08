'use strict';

  var BackgroundPage = require('../backgroundPage');

  function HRMPage6(configuration, broadcast, profile, pageNumber) {

    BackgroundPage.call(this, configuration, broadcast, profile, pageNumber);

    this.read(broadcast);

  }

  HRMPage6.prototype = Object.create(BackgroundPage.prototype);
  HRMPage6.prototype.constructor = HRMPage6;

  HRMPage6.prototype.read = function(broadcast) {
    var data = broadcast.data;

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
  };

  HRMPage6.prototype.toString = function() {
    return "P# " + this.number + " Features supported 0x" + this.featuresSupported.toString(16) +
      " enabled 0x" + this.featuresEnabled.toString(16);
  };

  module.exports = HRMPage6;
