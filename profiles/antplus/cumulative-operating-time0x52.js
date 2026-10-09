'use strict';

const CumulativeOperatingTimeShared = require('./cumulative-operating-time-shared');

class BatteryStatus {
  constructor(dataByte) {
    this.batteryStatus = (dataByte & 0x70) >> 4;
  }

  toString() {
    switch (this.batteryStatus) {
      case 0x00:
      case 0x06:
        return "Reserved";
      case 0x01:
        return "New";
      case 0x02:
        return "Good";
      case 0x03:
        return "OK";
      case 0x04:
        return "Low";
      case 0x05:
        return "Critical";
      case 0x07:
        return "Invalid";
      default:
        return "? - " + this.batteryStatus;
    }
  }
}

class CumulativeOperatingTime extends CumulativeOperatingTimeShared {
  constructor(configuration, broadcast, profile, pageNumber) {
    super(configuration, broadcast, profile, pageNumber);
    this.read(broadcast);
  }

  // Background Page 1
  read(broadcast) {
    const data = broadcast.data;

    this.batteryIdentifier = data[2] === 0xFF ? undefined : data[2] >> 4;
    this.numberOfBatteries = data[2] === 0xFF ? undefined : data[2] & 0x0F;
    this.descriptive = {
      coarseVoltage: data[7] & 0x0F,
      batteryStatus: new BatteryStatus(data[7]),
      resolution: (data[7] & 0x80) >> 7
    };

    const unitMultiplier = this.descriptive.resolution === 1 ? 2 : 16;

    if (data[3] === 0xFF && data[4] === 0xFF && data[5] === 0xFF) {
      this.cumulativeOperatingTime = undefined;
      this.cumulativeOperatingTimeString = undefined;
      this.lastBatteryReset = undefined;
    } else {
      this.readCumulativeOperatingTime(broadcast, 3, unitMultiplier);
    }

    this.fractionalBatteryVoltage = data[6] / 256;
    if (this.descriptive.coarseVoltage !== 0x0F) {
      this.batteryVoltage = this.fractionalBatteryVoltage + this.descriptive.coarseVoltage;
    }
  }

  toString() {
    let msg = "P# " + this.number + " Cumulative operating time ";

    if (this.cumulativeOperatingTime === undefined) {
      msg += "unavailable";
    } else {
      msg += this.cumulativeOperatingTimeString + ' Battery reset ca. ' + this.lastBatteryReset;
    }

    if (this.batteryIdentifier !== undefined) {
      msg += " Battery identifier " + this.batteryIdentifier + " of " + this.numberOfBatteries;
    }

    if (this.descriptive.coarseVoltage !== 0x0F) {
      msg += " Battery (V) " + this.batteryVoltage.toFixed(1);
    }

    msg += " Battery status " + this.descriptive.batteryStatus.toString();

    return msg;
  }
}

module.exports = CumulativeOperatingTime;
