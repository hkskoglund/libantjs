'use strict';
import DeviceProfile from '../device-profile.js';
import HRMPage4 from './hrm-page4.js';
import HRMPage0 from './hrm-page0.js';
import HRMPage5 from './hrm-page5.js';
import HRMPage6 from './hrm-page6.js';
import HRMPage9 from './hrm-page9.js';
import GenericPage from '../page.js';









class DeviceProfile_HRM extends DeviceProfile {
  constructor(configuration) {
    super(configuration);

    this.initMasterSlaveConfiguration();
    this.aggregatedRR = [];
    this.requestPageUpdate(DeviceProfile_HRM.DEFAULT_PAGE_UPDATE_DELAY, this.processAggregatedRR);
  }

  // Attach RR interval data to the latest page
  processAggregatedRR(latestPage) {
    if (this.aggregatedRR && this.aggregatedRR.length) {
      latestPage.aggregatedRR = this.aggregatedRR;
      this.aggregatedRR = [];
    }
  }

  getPage(broadcast) {
    const pageNumber = this.getPageNumber(broadcast);

    switch (pageNumber) {
      case 4:
        return new HRMPage4({ logger: this.log }, broadcast, this, pageNumber);
      case 0:
        return new HRMPage0({ logger: this.log }, broadcast, this, pageNumber);
      case 5:
        return new HRMPage5({ logger: this.log }, broadcast, this, pageNumber);
      case 6:
        return new HRMPage6({ logger: this.log }, broadcast, this, pageNumber);
      case 9:
        return new HRMPage9({ logger: this.log }, broadcast, this, pageNumber);
      default:
        return this.getBackgroundPage(broadcast, pageNumber);
    }
  }

  getPageNumber(broadcast) {
    const data = broadcast.data;

    if (this.isPageToggle(broadcast)) {
      return data[0] & GenericPage.BIT_MASK.PAGE_NUMBER;
    }

    return 0;
  }

  addPage(page) {
    super.addPage(page);

    if (page.RRInterval) {
      this.aggregatedRR.push(page.RRInterval);
    }
  }

  static DEFAULT_PAGE_UPDATE_DELAY = 1000;
  static CHANNEL_PERIOD = {
  DEFAULT: 8070
};
  static NAME = 'HRM';
  static CHANNEL_ID = {
  DEVICE_TYPE: 0x78,
  TRANSMISSION_TYPE: 0x01
};
  static INVALID_HEART_RATE = 0x00;
  static PAGE_TOGGLE_CAPABLE = true;
}



// Ca. 4 messages per second, or 1 message per 246.3 ms.







export default DeviceProfile_HRM;
