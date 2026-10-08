'use strict';

  var DeviceProfile = require('../deviceProfile'),
    GenericPage = require('../Page');

  function DeviceProfile_BikeShared(configuration) {

    DeviceProfile.call(this, configuration);

    if (configuration && configuration.wheelCircumference !== undefined) {
      if (!Number.isFinite(configuration.wheelCircumference) || configuration.wheelCircumference <= 0) {
        throw new RangeError('Wheel circumference must be a positive finite number');
      }
      this.WHEEL_CIRCUMFERENCE = configuration.wheelCircumference;
    } else {
      this.WHEEL_CIRCUMFERENCE = DeviceProfile_BikeShared.prototype.WHEEL_CIRCUMFERENCE;
    }

    this.initMasterSlaveConfiguration();

    this.requestPageUpdate(DeviceProfile_BikeShared.prototype.DEFAULT_PAGE_UPDATE_DELAY);
  }

  DeviceProfile_BikeShared.prototype = Object.create(DeviceProfile.prototype);
  DeviceProfile_BikeShared.prototype.constructor = DeviceProfile_BikeShared;

  DeviceProfile_BikeShared.prototype.DEFAULT_PAGE_UPDATE_DELAY = 1000;

  DeviceProfile_BikeShared.prototype.WHEEL_CIRCUMFERENCE = 2.07; // meters

  DeviceProfile_BikeShared.prototype.ROLLOVER_THRESHOLD = 64000; // Max time between pages/broadcasts for valid speed/cadence calculations which is based on state of the previous page

  DeviceProfile_BikeShared.prototype.getPageNumber = function(broadcast) {
    var data = broadcast.data,
      pageNumber;

    // Byte 0 - Page number

    if (this.isPageToggle(broadcast)) {

      pageNumber = data[0] & GenericPage.prototype.BIT_MASK.PAGE_NUMBER; // (7 lsb)
    } else {

      pageNumber = 0; // Legacy
    }

    return pageNumber;
  };

  module.exports = DeviceProfile_BikeShared;
  
