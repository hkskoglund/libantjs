'use strict';
import DeviceProfile from '../device-profile.js';
import GenericPage from '../page.js';



  class DeviceProfile_BikeShared extends DeviceProfile {
  constructor(configuration) {


    super(configuration);

    if (configuration && configuration.wheelCircumference !== undefined) {
      if (!Number.isFinite(configuration.wheelCircumference) || configuration.wheelCircumference <= 0) {
        throw new RangeError('Wheel circumference must be a positive finite number');
      }
      this.constructor.WHEEL_CIRCUMFERENCE = configuration.wheelCircumference;
    } else {
      this.constructor.WHEEL_CIRCUMFERENCE = DeviceProfile_BikeShared.WHEEL_CIRCUMFERENCE;
    }

    this.measurementPages = [];
  }

  getPageNumber(broadcast) {

    var data = broadcast.data,
      pageNumber;

    // Byte 0 - Page number

    if (this.isPageToggle(broadcast)) {

      pageNumber = data[0] & GenericPage.BIT_MASK.PAGE_NUMBER; // (7 lsb)
    } else {

      pageNumber = 0; // Legacy
    }

    return pageNumber;
  }

  getBikePage(broadcast, PageConstructor, processBackgroundPage) {

    var pageNumber = this.getPageNumber(broadcast),
      page;

    if (pageNumber === 0 || pageNumber === 4 || pageNumber === 5) {
      return new PageConstructor({
        logger: this.log
      }, broadcast, this, pageNumber);
    }

    page = this.getBackgroundPage(broadcast, pageNumber);

    if (page && pageNumber >= 1 && pageNumber <= 3) {
      processBackgroundPage.call(page, PageConstructor.prototype);
    } else if (!page && this.log && this.log.logging) {
      this.log.error('Failed to get background page for page number ' + pageNumber, this);
    }

    return page;
  }

  addPage(page) {

    DeviceProfile.prototype.addPage.call(this, page);

    if (!page) {
      return;
    }

    if (page.bikeSpeedEventTime === undefined && page.bikeCadenceEventTime === undefined) {
      return;
    }

    if (this.measurementPages.length >= this.constructor.MAX_UNFILTERED_BROADCAST_BUFFER) {
      this.measurementPages.shift();
    }

    this.measurementPages.push(page);
  }

  getPreviousBikeMeasurementPageValidateRolloverTime(currentPage) {

    var previousPage = this.measurementPages[this.measurementPages.length - 1];

    if (!previousPage) {
      return;
    }

    if (this.constructor.ROLLOVER_THRESHOLD &&
      currentPage.timestamp - previousPage.timestamp >= this.constructor.ROLLOVER_THRESHOLD) {
      if (this.log && this.log.logging) {
        this.log.warn('Time between bike measurement pages is longer than the rollover threshold (64s)', currentPage, previousPage);
      }
      return;
    }

    return previousPage;
  }

  static DEFAULT_PAGE_UPDATE_DELAY = 1000;
  static WHEEL_CIRCUMFERENCE = 2.07;
  static ROLLOVER_THRESHOLD = 64000;
}






   // meters

   // Max time between pages/broadcasts for valid speed/cadence calculations which is based on state of the previous page









  export default DeviceProfile_BikeShared;

