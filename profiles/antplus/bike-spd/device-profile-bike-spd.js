'use strict';
import DeviceProfileBikeShared from '../bike-spdcad/device-profile-bike-shared.js';
import BikePage0 from './bike-page0.js';



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

  static NAME = 'BIKE_SPD';
  static CHANNEL_ID = {
    DEVICE_TYPE: 0x7B, // 123
    // TRANSMISSION_TYPE: 1 // or 5
  };
  static CHANNEL_PERIOD = {
    DEFAULT: 8118, // 4.06Hz
  };
  static PAGE_TOGGLE_CAPABLE = true;
}
















  export default DeviceProfile_BikeSpd;

