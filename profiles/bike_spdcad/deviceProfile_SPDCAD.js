/* globals define: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var DeviceProfileBikeShared = require('./deviceProfile_BikeShared'),
    SPDCADPage0 = require('./SPDCADPage0');

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

    var pageNumber = this.getPageNumber(broadcast),
      page;

    if (pageNumber === 0) // MAIN
    {

      page = new SPDCADPage0({
        logger: this.log
      }, broadcast, this, pageNumber);

    } else {
      page = this.getBackgroundPage(broadcast, pageNumber);

      if (page) {
        SPDCADPage0.prototype.readCadence.call(page, SPDCADPage0.prototype);
        SPDCADPage0.prototype.calcCadence.call(page, SPDCADPage0.prototype);
        SPDCADPage0.prototype.readSpeed.call(page, SPDCADPage0.prototype);
        SPDCADPage0.prototype.calcSpeed.call(page, SPDCADPage0.prototype);

      } else {
        if (this.log && this.log.logging) {
          this.log.log('error', 'Failed to get background page for page number ' + pageNumber, this);
        }
      }
    }

    return page;

  };

  module.exports = DeviceProfile_SPDCAD;
  return module.exports;

});