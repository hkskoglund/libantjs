'use strict';

  var MainPage = require('../main-page');

  class BikePowerDataPage extends MainPage {
  constructor(configuration, broadcast, profile, pageNumber) {

    super(configuration, broadcast, profile, pageNumber);
  }

  readCommonBytes(broadcast) {

    var data = broadcast.data,
      dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);

    this.rawData = Uint8Array.from(data);

    switch (this.number) {
      case 0x02:
        this.subpageNumber = data[1];
        this.subpageData = Uint8Array.from(data.subarray(2));
        break;

      case 0x03:
        this.dataTypeCount = data[1] & 0x0F;
        this.dataType = data[2];
        this.scaleFactor = data[3] > 0x7F ? data[3] - 0x100 : data[3];
        this.measurementTimestamp = dataView.getUint16(4, true) / 2048;
        this.measurementValue = dataView.getInt16(6, true);
        break;

      case 0x11:
      case 0x12:
        this.updateEventCount = data[1];
        this.tickCount = data[2];
        this.instantaneousCadence = data[3] === 0xFF ? undefined : data[3];
        this.accumulatedPeriod = dataView.getUint16(4, true);
        this.accumulatedPeriodSeconds = this.accumulatedPeriod / 2048;
        this.accumulatedTorque = dataView.getUint16(6, true);
        this.accumulatedTorqueNm = this.accumulatedTorque / 32;
        break;

      case 0x13:
        this.updateEventCount = data[1];
        this.leftTorqueEffectiveness = this.readPercentage(data[2]);
        this.rightTorqueEffectiveness = this.readPercentage(data[3]);
        this.leftPedalSmoothness = this.readPercentage(data[4]);
        this.rightPedalSmoothness = data[5] === 0xFE ? undefined : this.readPercentage(data[5]);
        if (data[5] === 0xFE)
          this.combinedPedalSmoothness = this.leftPedalSmoothness;
        break;

      case 0x20:
        this.updateEventCount = data[1];
        this.slope = dataView.getUint16(2, false) / 10;
        this.measurementTimestamp = dataView.getUint16(4, false) / 2000;
        this.torqueTicksStamp = dataView.getUint16(6, false);
        break;
    }
  }

  readPercentage(value) {

    return value === 0xFF ? undefined : value / 2;
  }

  toString() {

    var details = [];

    if (this.instantaneousCadence !== undefined)
      details.push('Cadence ' + this.instantaneousCadence + ' rpm');
    if (this.accumulatedTorqueNm !== undefined)
      details.push('Accumulated torque ' + this.accumulatedTorqueNm + ' Nm');
    if (this.instantaneousPower !== undefined)
      details.push('Power ' + this.instantaneousPower + ' W');
    if (this.slope !== undefined)
      details.push('Slope ' + this.slope + ' Nm/Hz');
    if (this.measurementValue !== undefined)
      details.push('Measurement ' + this.measurementValue + ' (type ' + this.dataType + ')');
    if (this.subpageNumber !== undefined)
      details.push('Subpage ' + this.subpageNumber);

    return 'P# ' + this.number + (details.length ? ' ' + details.join(', ') : '');
  }
}










  module.exports = BikePowerDataPage;
