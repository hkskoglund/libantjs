'use strict';

const BackgroundPage = require('./background-page');

class CumulativeOperatingTimeShared extends BackgroundPage {
  readCumulativeOperatingTime(broadcast, offset, unitMultiplier) {
    const data = broadcast.data;
    const multiplier = unitMultiplier || 2;
    const byte1 = data[offset];
    const byte2 = data[offset + 1];
    const byte3 = data[offset + 2];

    this.cumulativeOperatingTime = ((byte3 << 16) | (byte2 << 8) | byte1) * multiplier;
    this.cumulativeOperatingTimeString = this.cumulativeOperatingTime < 3600
      ? this.cumulativeOperatingTime.toFixed(1) + 's '
      : (this.cumulativeOperatingTime / 3600).toFixed(1) + ' h';
    this.lastBatteryReset = new Date(Date.now() - this.cumulativeOperatingTime * 1000).toLocaleString();
  }
}

module.exports = CumulativeOperatingTimeShared;
