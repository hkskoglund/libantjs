'use strict';
import MainPage from '../main-page.js';



  class PowerOnlyMainPage0x10 extends MainPage {
  constructor(configuration, broadcast, profile, pageNumber) {


    super(configuration, broadcast, profile, pageNumber);
  }

  readPower() {

    var data = this.broadcast.data,
      dataView = new DataView(data.buffer),
      previousPage = this.profile.getPreviousPage();

    this.updateEventCount = data[1];

    // Rollover 255
    this.pedalPower = data[2];

    if (this.pedalPower !== this.constructor.PEDAL_POWER_NOT_USED) {
      this.isRightPedalPower = (data[2] & this.constructor.BIT_MASK.PEDAL_DIFFERENTIATION) >> 7; // Bit 7 == 1 - right, == 0 - unknown
      this.pedalPowerPercent = data[2] & this.constructor.BIT_MASK.PEDAL_POWER_PERCENT;
    }

    // 0-254 rpm, 255=invalid
    this.instantaneousCadence = data[3] === 0xFF ? undefined : data[3];

    // (May be) Used for bad RF conditions with loss of packets
    this.accumulatedPower = dataView.getUint16(data.byteOffset + 4, true);

    this.instantaneousPower = dataView.getUint16(data.byteOffset + 6, true);

    // .profile is set in generic Page.js
    if (previousPage !== undefined && this.updateEventCount === previousPage.updateEventCount) {
      this.pageNotUpdated = true;
    }
  }

  readCommonBytes() {

    this.readPower();
  }

  static PEDAL_POWER_NOT_USED = 0xFF;
  static BIT_MASK = {
    PEDAL_POWER_PERCENT: parseInt("01111111", 2),
    PEDAL_DIFFERENTIATION: parseInt("10000000", 2)
  };
}











  export default PowerOnlyMainPage0x10;

