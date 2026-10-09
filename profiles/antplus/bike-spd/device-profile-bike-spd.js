'use strict';

  var DeviceProfileBikeShared = require('../bike-spdcad/device-profile-bike-shared'),
    BikePage0 = require('./bike-page0');

  class DeviceProfile_BikeSpd extends DeviceProfileBikeShared {
  constructor(configuration) {


    super(configuration);

    this.initMasterSlaveConfiguration();

    this.requestPageUpdate(DeviceProfile_BikeSpd.prototype.DEFAULT_PAGE_UPDATE_DELAY);
  }

  getPage(broadcast) {

    return this.getBikePage(broadcast, BikePage0, function(prototype) {
      BikePage0.prototype.readSpeed.call(this, prototype);
      BikePage0.prototype.calcSpeed.call(this, prototype);
    });
  }
}





  DeviceProfile_BikeSpd.prototype.NAME = 'BIKE_SPD';

  DeviceProfile_BikeSpd.prototype.CHANNEL_ID = {
    DEVICE_TYPE: 0x7B, // 123
    // TRANSMISSION_TYPE: 1 // or 5
  };

  DeviceProfile_BikeSpd.prototype.CHANNEL_PERIOD = {
    DEFAULT: 8118, // 4.06Hz
  };

  DeviceProfile_BikeSpd.prototype.PAGE_TOGGLE_CAPABLE = true;




  module.exports = DeviceProfile_BikeSpd;

