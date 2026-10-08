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

    this.measurementPages = [];
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

  DeviceProfile_BikeShared.prototype.getBikePage = function(broadcast, PageConstructor, processBackgroundPage) {
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
  };

  DeviceProfile_BikeShared.prototype.addPage = function(page) {
    DeviceProfile.prototype.addPage.call(this, page);

    if (!page) {
      return;
    }

    if (page.bikeSpeedEventTime === undefined && page.bikeCadenceEventTime === undefined) {
      return;
    }

    if (this.measurementPages.length >= this.MAX_UNFILTERED_BROADCAST_BUFFER) {
      this.measurementPages.shift();
    }

    this.measurementPages.push(page);
  };

  DeviceProfile_BikeShared.prototype.getPreviousBikeMeasurementPageValidateRolloverTime = function(currentPage) {
    var previousPage = this.measurementPages[this.measurementPages.length - 1];

    if (!previousPage) {
      return;
    }

    if (this.ROLLOVER_THRESHOLD &&
      currentPage.timestamp - previousPage.timestamp >= this.ROLLOVER_THRESHOLD) {
      if (this.log && this.log.logging) {
        this.log.warn('Time between bike measurement pages is longer than the rollover threshold (64s)', currentPage, previousPage);
      }
      return;
    }

    return previousPage;
  };

  module.exports = DeviceProfile_BikeShared;
  
