/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */
  'use strict';

  var DeviceProfile = require('../deviceProfile'),
    BikeSpdPage0 = require('../bike_spd/bikePage0'),
    BikeCadPage0 = require('../bike_cad/bikePage0'),
    SPDCADPage0 = require('../bike_spdcad/SPDCADPage0'),
    CumulativeOperatingTime = require('../cumulativeOperatingTime'),
    ManufacturerId = require('../manufacturerId'),
    ProductId = require('../productId'),
    GenericPage = require('../Page');

  function DeviceProfile_BikeShared(configuration) {

    DeviceProfile.call(this, configuration);

    this.initMasterSlaveConfiguration();

    this.requestPageUpdate(DeviceProfile_BikeShared.prototype.DEFAULT_PAGE_UPDATE_DELAY);
  }

  DeviceProfile_BikeShared.prototype = Object.create(DeviceProfile.prototype);
  DeviceProfile_BikeShared.prototype.constructor = DeviceProfile_BikeShared;

  DeviceProfile_BikeShared.prototype.DEFAULT_PAGE_UPDATE_DELAY = 1000;

  DeviceProfile_BikeShared.prototype.WHEEL_CIRCUMFERENCE = 2.07; // in meter -> should be able to configure in a setting

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
  return module.exports;
