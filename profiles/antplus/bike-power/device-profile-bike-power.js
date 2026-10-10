'use strict';

  var

    DeviceProfile = require('../device-profile'),
    PowerOnlyMainPage0x10 = require('../bike-power/power-only-main-page0x10'),
    BackgroundPage = require('../background-page'),
    CalibrationMainPage = require('../bike-power/calibration-main'),
    BikePowerDataPage = require('../bike-power/bike-power-data-page');


  class DeviceProfile_BikePower extends DeviceProfile {
  constructor(configuration) {


    super(configuration);

    this.initMasterSlaveConfiguration();

    this.requestPageUpdate(this.DEFAULT_PAGE_UPDATE_DELAY);
  }

  createManualZeroRequest() {

    return Uint8Array.from([0x01, 0xAA, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  }

  requestManualZero(sendAcknowledged) {

    if (typeof sendAcknowledged !== 'function') {
      throw new TypeError('sendAcknowledged must be a function bound to the sensor channel');
    }

    return sendAcknowledged(this.createManualZeroRequest());
  }

  getPageNumber(broadcast) {

    var data = broadcast.data,
      pageNumber;

    pageNumber = data[0];

    return pageNumber;
  }

  getPage(broadcast) {

    var page,
      pageNumber = this.getPageNumber(broadcast);

    switch (pageNumber) {


      case 0x01:

        page = new CalibrationMainPage({
          logger: this.log
        }, broadcast, this, pageNumber);

        break;

      case 0x10:

        page = new PowerOnlyMainPage0x10({
          logger: this.log
        }, broadcast, this, pageNumber);

        break;

      case 0x02:
      case 0x03:
      case 0x11:
      case 0x12:
      case 0x13:
      case 0x20:
      case 0xE0:
      case 0xE1:
      case 0xE2:

        page = new BikePowerDataPage({
          logger: this.log
        }, broadcast, this, pageNumber);

        break;

        // BACKGROUND pages

        // required
      case BackgroundPage.prototype.COMMON.PAGE0x50:
      case BackgroundPage.prototype.COMMON.PAGE0x51:

        // optional
        // falls through
      case BackgroundPage.prototype.COMMON.PAGE0x52:

        page = this.getBackgroundPage(broadcast, pageNumber);

        if (page) {
          //HRMPage.prototype.readHR.call(page);
          //HRMPage.prototype.calcRRInterval.call(page);
        }

        break;

      default:

        if (this.log && this.log.logging) {
          this.log.error( 'Unable to handle page number', pageNumber, pageNumber.toString(16), broadcast, this);
        }

        break;

    }

    return page;
  }
}




  DeviceProfile_BikePower.prototype.DEFAULT_PAGE_UPDATE_DELAY = 1000;

  // Transmission from power sensor each 8182/32768 seconds -> approx 4.00 Hz, ANT+ Managed Network Document – Bicycle Power Device Profile, 4.1 - p. 19 CHANNEL configuration
  DeviceProfile_BikePower.prototype.CHANNEL_PERIOD = {
    DEFAULT: 8182,

  };

  DeviceProfile_BikePower.prototype.NAME = 'BIKE_POWER';

  DeviceProfile_BikePower.prototype.CHANNEL_ID = {
    DEVICE_TYPE: 0x0B,
    TRANSMISSION_TYPE: 0x05
  };







  // Parse received page


  module.exports = DeviceProfile_BikePower;

