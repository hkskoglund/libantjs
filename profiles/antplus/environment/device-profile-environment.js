'use strict';
import DeviceProfile from '../device-profile.js';
import TempPage0 from './temperature-page0.js';
import TempPage1 from './temperature-page1.js';



  class DeviceProfile_ENVIRONMENT extends DeviceProfile {
  constructor(configuration) {


    super(configuration);

    var channelPeriod = configuration && configuration.channelPeriod;
    if (channelPeriod !== undefined &&
      channelPeriod !== DeviceProfile_ENVIRONMENT.CHANNEL_PERIOD.DEFAULT &&
      channelPeriod !== DeviceProfile_ENVIRONMENT.CHANNEL_PERIOD.ALTERNATIVE) {
      throw new RangeError('Unsupported ANT+ Environment channel period: ' + channelPeriod);
    }

    this.initMasterSlaveConfiguration(channelPeriod);

    this.requestPageUpdate(DeviceProfile_ENVIRONMENT.DEFAULT_PAGE_UPDATE_DELAY);
  }

  static async requestStartupPages(sendAcknowledged, wait) {
    if (typeof sendAcknowledged !== 'function') {
      throw new TypeError('sendAcknowledged must be a function bound to the sensor channel');
    }
    if (typeof wait !== 'function') {
      throw new TypeError('wait must be a delay function');
    }

    const pageNumbers = [0x50, 0x51, 0x52];
    for (let i = 0; i < pageNumbers.length; i++) {
      await sendAcknowledged(Uint8Array.from([
        0x46, 0xFF, 0xFF, 0xFF, 0xFF, 0x01, pageNumbers[i], 0x01
      ]));
      if (i < pageNumbers.length - 1) {
        await wait(DeviceProfile_ENVIRONMENT.STARTUP_REQUEST_INTERVAL);
      }
    }
  }

  getPageNumber(broadcast) {

    return broadcast.data[0];
  }

  getPage(broadcast) {

    var page,
      pageNumber = this.getPageNumber(broadcast);

    switch (pageNumber) {

      // Device capabilities - why main page?
      case 0:

        page = new TempPage0({
          logger: this.log
        }, broadcast, this, pageNumber);


        break;

        // Temperature
      case 1:

        page = new TempPage1({
          logger: this.log
        }, broadcast, this, pageNumber);


        break;

    }

    // Only route supported common pages; pages 2-63 are reserved by this profile.
    if (pageNumber === 0x50 || pageNumber === 0x51 || pageNumber === 0x52) {
      page = this.getBackgroundPage(broadcast, pageNumber);
    }

    return page;
  }

  static DEFAULT_PAGE_UPDATE_DELAY = 5000;
  static STARTUP_REQUEST_INTERVAL = 45000;
  static CHANNEL_ID = {
    DEVICE_TYPE: 25, // 0x19
    TRANSMISSION_TYPE: 0x05 // Low nibble
  };
  static CHANNEL_PERIOD = {
    DEFAULT: 8192, // 4Hz
    ALTERNATIVE: 65535 // 0.5 Hz low power
  };
}











  export default DeviceProfile_ENVIRONMENT;
