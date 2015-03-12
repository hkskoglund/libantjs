/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function ClientClientBeacon()
  {
     this.beaconID = undefined;
     this.status1 = undefined;
     this.status2 = undefined;
     this.authenticationType = undefined;
     this.descriptor = undefined;           // Link layer
     this.hostSerialNumber = undefined;     // Authentication/Transport layer
  }

  ClientBeacon.prototype.BIT_MASK = {
    DATA_AVAILABLE : 0x20,        // 0010 0000 bit 5
    UPLOAD_ENABLED : 0x10,        // 0001 0000 bit 4
    PAIRING_ENABLED  : 0x08,      // 0000 1000 bit 3
    BEACON_CHANNEL_PERIOD : 0x07  // 0000 0111 bit 2-0
  };

  ClientBeacon.decode = function(data, onlyDataPayload) {

  // if onlyDataPayload === true, SYNC MSG. LENGTH MSG ID CHANNEL NR is stripped off beacon ->
  // used when assembling burst transfer that contain a beacon in the first packet
  var substractIndex, self = this; // Used to get the adjust index in the data

  if (typeof onlyDataPayload === "undefined")
    substractIndex = 0;
  else if (onlyDataPayload)
    substractIndex = 4;

  var
    beaconInfo = {
      status1: data[5 - substractIndex],
      status2: data[6 - substractIndex],
      authenticationType: data[7 - substractIndex],
    };

  beaconInfo.dataAvailable = beaconInfo.status1 & 0x20 ? true : false; // Bit 5
  beaconInfo.uploadEnabled = beaconInfo.status1 & 0x10 ? true : false; // Bit 4
  beaconInfo.pairingEnabled = beaconInfo.status1 & 0x08 ? true : false; // Bit 3
  beaconInfo.beaconChannelPeriod = beaconInfo.status1 & 0x7; // Bit 2-0

  beaconInfo.clientDeviceState = beaconInfo.status2 & 0x0F; // Bit 3-0 (0100-1111 reserved), bit 7-4 reserved

  if (beaconInfo.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.AUTHENTICATION_LAYER || beaconInfo.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.TRANSPORT_LAYER || beaconInfo.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.BUSY) {
    beaconInfo.hostSerialNumber = data.readUInt32LE(8 - substractIndex);
  } else if (beaconInfo.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.LINK_LAYER) {
    beaconInfo.deviceType = data.readUInt16LE(8 - substractIndex);
    beaconInfo.manufacturerID = data.readUInt16LE(10 - substractIndex);
  }

  function parseStatus1() {
    var status1Str;

    status1Str = "ANT-FS ClientBeacon ";

    if (beaconInfo.dataAvailable)
      status1Str += "+Data ";
    else
      status1Str += "-Data. ";

    if (beaconInfo.uploadEnabled)
      status1Str += "+Upload ";
    else
      status1Str += "-Upload ";

    if (beaconInfo.pairingEnabled)
      status1Str += "+Pairing ";
    else
      status1Str += "-Pairing ";

    status1Str += "(" + beaconInfo.status1 + ") " + DeviceProfile_ANTFS.prototype.BEACON_CHANNEL_PERIOD[beaconInfo.beaconChannelPeriod];

    return status1Str;

  }

  beaconInfo.toString = function() {
    var str,
      INTERNAL_CLOCK_RATE = 32768; // 32.768 kHz internal clock, extended message info. RX_Timestamp rolls over each 2 seconds

    if (beaconInfo.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.LINK_LAYER) {
      str = parseStatus1() + " " + DeviceProfile_ANTFS.prototype.STATE[beaconInfo.status2 & 0x0F] + " Device type " + beaconInfo.deviceType + " Manuf. ID " + beaconInfo.manufacturerID + " " + DeviceProfile_ANTFS.prototype.AUTHENTICATION_TYPE[beaconInfo.authenticationType];
    } else
      str = parseStatus1() + " " + DeviceProfile_ANTFS.prototype.STATE[beaconInfo.status2 & 0x0F] + " Host SN. " + beaconInfo.hostSerialNumber + " " + DeviceProfile_ANTFS.prototype.AUTHENTICATION_TYPE[beaconInfo.authenticationType];


    if (typeof self.channelID !== "undefined")
      str += " " + self.channelID.toString();

    if (typeof self.RX_Timestamp !== "undefined")
      str += " RX timestamp " + self.RX_Timestamp + " = " + (self.RX_Timestamp / (INTERNAL_CLOCK_RATE / 1000)).toFixed(1) + " ms";

    if (typeof self.RX_Timestamp_Difference !== "undefined")
      str += " previous RX timestamp difference " + (self.RX_Timestamp_Difference / (INTERNAL_CLOCK_RATE / 1000)).toFixed(1) + " ms";

    return str;
  };


  return beaconInfo;
  };

  module.exports = ClientBeacon;
  return module.exports;
});
