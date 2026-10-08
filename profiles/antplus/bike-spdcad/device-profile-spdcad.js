'use strict';

  var DeviceProfileBikeShared = require('./device-profile-bike-shared'),
    SPDCADPage0 = require('./spdcad-page0');

  function DeviceProfile_SPDCAD(configuration) {

    DeviceProfileBikeShared.call(this, configuration);

    this.initMasterSlaveConfiguration();

    this.requestPageUpdate(DeviceProfile_SPDCAD.prototype.DEFAULT_PAGE_UPDATE_DELAY);
  }

  DeviceProfile_SPDCAD.prototype = Object.create(DeviceProfileBikeShared.prototype);
  DeviceProfile_SPDCAD.prototype.constructor = DeviceProfile_SPDCAD;


  DeviceProfile_SPDCAD.prototype.NAME = 'SPDCAD';

  DeviceProfile_SPDCAD.prototype.CHANNEL_ID = {
    DEVICE_TYPE: 0x79, // 121
    TRANSMISSION_TYPE: 1
  };

  DeviceProfile_SPDCAD.prototype.CHANNEL_PERIOD = {
    DEFAULT: 8086, // Ca. 4 messages pr. sec.

  };

  DeviceProfile_SPDCAD.prototype.getPage = function(broadcast) {
    return this.getBikePage(broadcast, SPDCADPage0, function(prototype) {
      SPDCADPage0.prototype.readCadence.call(this, prototype);
      SPDCADPage0.prototype.calcCadence.call(this, prototype);
      SPDCADPage0.prototype.readSpeed.call(this, prototype);
      SPDCADPage0.prototype.calcSpeed.call(this, prototype);
    });
  };

  module.exports = DeviceProfile_SPDCAD;
  
