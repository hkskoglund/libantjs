'use strict';

  var DeviceProfileBikeShared = require('../bike-spdcad/device-profile-bike-shared'),
    BikePage0 = require('./bike-page0');

  class DeviceProfile_BikeCad extends DeviceProfileBikeShared {
  constructor(configuration) {


    super(configuration);

    this.initMasterSlaveConfiguration();

    this.requestPageUpdate(DeviceProfile_BikeCad.prototype.DEFAULT_PAGE_UPDATE_DELAY);
  }

  getPage(broadcast) {

    return this.getBikePage(broadcast, BikePage0, function(prototype) {
      BikePage0.prototype.readCadence.call(this, prototype);
      BikePage0.prototype.calcCadence.call(this, prototype);
    });
  }
}




  DeviceProfile_BikeCad.prototype.NAME = 'BIKE_CAD';

  DeviceProfile_BikeCad.prototype.CHANNEL_ID = {
    DEVICE_TYPE: 0x7A, // 122
    //TRANSMISSION_TYPE: 1 // or 5
  };

  DeviceProfile_BikeCad.prototype.CHANNEL_PERIOD = {
    DEFAULT: 8102,
  };

  DeviceProfile_BikeCad.prototype.PAGE_TOGGLE_CAPABLE = true;



  module.exports = DeviceProfile_BikeCad;

