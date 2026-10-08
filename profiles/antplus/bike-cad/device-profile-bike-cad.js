'use strict';

  var DeviceProfileBikeShared = require('../bike-spdcad/device-profile-bike-shared'),
    BikePage0 = require('./bike-page0');

  function DeviceProfile_BikeCad(configuration) {

    DeviceProfileBikeShared.call(this, configuration);

    this.initMasterSlaveConfiguration();

    this.requestPageUpdate(DeviceProfile_BikeCad.prototype.DEFAULT_PAGE_UPDATE_DELAY);
  }

  DeviceProfile_BikeCad.prototype = Object.create(DeviceProfileBikeShared.prototype);
  DeviceProfile_BikeCad.prototype.constructor = DeviceProfile_BikeCad;

  DeviceProfile_BikeCad.prototype.NAME = 'BIKE_CAD';

  DeviceProfile_BikeCad.prototype.CHANNEL_ID = {
    DEVICE_TYPE: 0x7A, // 122
    //TRANSMISSION_TYPE: 1 // or 5
  };

  DeviceProfile_BikeCad.prototype.CHANNEL_PERIOD = {
    DEFAULT: 8102,
  };

  DeviceProfile_BikeCad.prototype.PAGE_TOGGLE_CAPABLE = true;

  DeviceProfile_BikeCad.prototype.getPage = function(broadcast) {
    return this.getBikePage(broadcast, BikePage0, function(prototype) {
      BikePage0.prototype.readCadence.call(this, prototype);
      BikePage0.prototype.calcCadence.call(this, prototype);
    });
  };

  module.exports = DeviceProfile_BikeCad;
  
