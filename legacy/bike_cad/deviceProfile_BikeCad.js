/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var DeviceProfileBikeShared = require('../bike_spdcad/deviceProfile_BikeShared'),
    BikePage0 = require('./bikePage0');

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

    var pageNumber = this.getPageNumber(broadcast),
      page;

    if (pageNumber === 0) // MAIN
    {

      page = new BikePage0({
        logger: this.log
      }, broadcast, this, pageNumber);

    } else {
      page = this.getBackgroundPage(broadcast, pageNumber);

      if (page) {
        BikePage0.prototype.readCadence.call(page, BikePage0.prototype);
        BikePage0.prototype.calcCadence.call(page, BikePage0.prototype);

      } else {
        if (this.log && this.log.logging) {
          this.log.log('error', 'Failed to get background page for page number ' + pageNumber, this);
        }
      }
    }

    return page;

  };

  module.exports = DeviceProfile_BikeCad;
  
