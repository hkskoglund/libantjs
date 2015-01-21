/* global define: true, Int8Array: true, DataView: true, Uint8Array: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
// Function names based on Dynastram Android SDK v 4.00 documentation
function RSSI(measurementType, RSSIValue, proximityBinThreshold) {

    if (typeof measurementType !== "undefined")
        this.measurementType = measurementType;

    if (typeof RSSIValue !== "undefined")
        this.RSSIValue = RSSIValue;

    if (typeof proximityBinThreshold !== "undefined") {
        
        this.thresholdConfigurationValue = (new Int8Array([proximityBinThreshold]))[0]; // Default -128 dB = "Off" -setting , spec. p. 36, specified in proximity search command
    }
}

RSSI.prototype.parse = function (extendedData) {
    //var extendedDataUint8 = new Uint8Array(extendedData); // Allows using [], which cannot be used on an ArrayBuffer
    var extendedDataView = new DataView(extendedData.buffer);
    
    this.measurementType = extendedData[0];

    if (this.measurementType !== RSSI.prototype.MEASUREMENT_TYPE.dBm) // Stop decoding according to spec.
        return;

    this.RSSIValue = extendedDataView.getInt8(extendedData.byteOffset+1);
    
    this.thresholdConfigurationValue = extendedDataView.getInt8(extendedData.byteOffset+2); // Signed int (2's complement ?)
};

RSSI.prototype.getRawMeasurementType = function () {
    return this.measurementType;
};

RSSI.prototype.getRSSIValue = function () {
    return this.RSSIValue;
};

RSSI.prototype.getThresholdConfigDB = function () {
    return this.thresholdConfigurationValue;
};

RSSI.prototype.toString = function () {
    return "RSSI " + this.RSSIValue +" "+RSSI.prototype.MEASUREMENT_TYPE[this.measurementType] + " Proximity threshold " + this.thresholdConfigurationValue+" dBm";
};

// http://en.wikipedia.org/wiki/DBm 
// 0dBm = 1mW
RSSI.prototype.MEASUREMENT_TYPE = 
{
    0x20 : "dBm",
    dBm: 0x20 // Units of dBm
};

module.exports = RSSI;
    return module.exports;
});
