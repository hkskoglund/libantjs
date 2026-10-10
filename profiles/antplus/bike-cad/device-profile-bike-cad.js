'use strict';
import DeviceProfileBikeShared from '../bike-spdcad/device-profile-bike-shared.js';
import BikePage0 from './bike-page0.js';



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

  static NAME = 'BIKE_CAD';
  static CHANNEL_ID = {
    DEVICE_TYPE: 0x7A, // 122
    //TRANSMISSION_TYPE: 1 // or 5
  };
  static CHANNEL_PERIOD = {
    DEFAULT: 8102,
  };
  static PAGE_TOGGLE_CAPABLE = true;
}














  export default DeviceProfile_BikeCad;

