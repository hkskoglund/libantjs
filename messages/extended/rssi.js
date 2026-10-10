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

    var extendedDataView = new DataView(extendedData.buffer);

    this.measurementType = extendedData[0];

    if (this.measurementType !== RSSI.MEASUREMENT_TYPE.dBm) // Stop decoding according to spec.
      return;

    this.RSSIValue = extendedDataView.getInt8(extendedData.byteOffset + 1);

    this.thresholdConfigurationValue = extendedDataView.getInt8(extendedData.byteOffset + 2); // Signed int (2's complement ?)
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

  toString() {

    return "RSSI " + this.RSSIValue + " " + RSSI.MEASUREMENT_TYPE[this.measurementType] + " Proximity threshold " + this.thresholdConfigurationValue + " dBm";
  }

  static MEASUREMENT_TYPE = {
  0x20: "dBm",
  dBm: 0x20 // Units of dBm
};
}

// http://en.wikipedia.org/wiki/DBm
// 0dBm = 1mW


export default RSSI;

