'use strict';
import DeviceProfileBikeShared from './device-profile-bike-shared.js';
import SPDCADPage0 from './spdcad-page0.js';



  class DeviceProfile_SPDCAD extends DeviceProfileBikeShared {
  constructor(configuration) {


    super(configuration);

    this.initMasterSlaveConfiguration();

    this.requestPageUpdate(DeviceProfile_SPDCAD.prototype.DEFAULT_PAGE_UPDATE_DELAY);
  }

  getPage(broadcast) {

    return this.getBikePage(broadcast, SPDCADPage0, function(prototype) {
      SPDCADPage0.prototype.readCadence.call(this, prototype);
      SPDCADPage0.prototype.calcCadence.call(this, prototype);
      SPDCADPage0.prototype.readSpeed.call(this, prototype);
      SPDCADPage0.prototype.calcSpeed.call(this, prototype);
    });
  }

  static NAME = 'SPDCAD';
  static CHANNEL_ID = {
    DEVICE_TYPE: 0x79, // 121
    TRANSMISSION_TYPE: 1
  };
  static CHANNEL_PERIOD = {
    DEFAULT: 8086, // Ca. 4 messages pr. sec.

  };
}













  export default DeviceProfile_SPDCAD;

