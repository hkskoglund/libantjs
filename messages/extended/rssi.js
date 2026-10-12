'use strict';
// Function names based on Dynastram Android SDK v 4.00 documentation
class RSSI {
  constructor(measurementType, RSSIValue, proximityBinThreshold) {

    if (typeof measurementType !== "undefined")
      this.measurementType = measurementType;

    if (typeof RSSIValue !== "undefined")
      this.RSSIValue = RSSIValue;

    if (typeof proximityBinThreshold !== "undefined") {

      this.thresholdConfigurationValue = (new Int8Array([proximityBinThreshold]))[0]; // Default -128 dB = "Off" -setting , spec. p. 36, specified in proximity search command
    }
  }

  decode(extendedData) {

    var extendedDataView = new DataView(
      extendedData.buffer,
      extendedData.byteOffset,
      extendedData.byteLength
    );

    this.measurementType = extendedData[0];

    if (this.measurementType === RSSI.MEASUREMENT_TYPE.dBm) {
      this.RSSIValue = extendedDataView.getInt8(1);
      this.thresholdConfigurationValue = extendedDataView.getInt8(2);
    } else if (this.measurementType === RSSI.MEASUREMENT_TYPE.raw) {
      this.rawMeasurementValue = extendedDataView.getUint16(2, true);
    }
  }

  getRawMeasurementType() {

    return this.measurementType;
  }

  getRSSIValue() {

    return this.RSSIValue;
  }

  getThresholdConfigDB() {

    return this.thresholdConfigurationValue;
  }

  getRawMeasurementValue() {

    return this.rawMeasurementValue;
  }

  toString() {

    if (this.measurementType === RSSI.MEASUREMENT_TYPE.raw) {
      var valueHex = this.rawMeasurementValue.toString(16).toUpperCase().padStart(4, '0');
      return "RSSI raw measurement: " + this.rawMeasurementValue + " (0x" + valueHex + ")";
    }

    return "RSSI " + this.RSSIValue + " " + RSSI.MEASUREMENT_TYPE[this.measurementType] + " Proximity threshold " + this.thresholdConfigurationValue + " dBm";
  }

  static MEASUREMENT_TYPE = {
  0x10: "raw",
  0x20: "dBm",
  raw: 0x10,
  dBm: 0x20 // Units of dBm
};

  static getDataLength(measurementType) {
    if (measurementType === RSSI.MEASUREMENT_TYPE.raw)
      return 4;
    if (measurementType === RSSI.MEASUREMENT_TYPE.dBm)
      return 3;
  }
}

// http://en.wikipedia.org/wiki/DBm
// 0dBm = 1mW


export default RSSI;
