/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var State = require('./util/state'),
      AuthenticationType = require('./util/authenticationType');

  function ClientBeacon(payload) {

   if (payload)
    this.decode(payload);

   this.clientDeviceState = 'UNKNOWN';
  }

  ClientBeacon.prototype.PAYLOAD_LENGTH = 0x08;

  ClientBeacon.prototype.BIT_MASK = {

    DATA_AVAILABLE:         0x20, // 0010 0000 bit 5
    UPLOAD_ENABLED:         0x10, // 0001 0000 bit 4
    PAIRING_ENABLED:        0x08, // 0000 1000 bit 3
    BEACON_CHANNEL_PERIOD:  0x07, // 0000 0111 bit 2-0

    DEVICE_TYPE_MANAGED_BY : 0x4000 // MSB 1 = device type ANT+ alliance managed, MSB 0 = device type Dynastream managed
  };

  ClientBeacon.prototype.CHANNEL_PERIOD = {

    Hz05  : 0x00,
    Hz1   : 0x01,
    Hz2   : 0x02,
    Hz4   : 0x03,
    Hz8   : 0x04
  };

  ClientBeacon.prototype.decode = function(payload) {

    var dv = new DataView(payload.buffer),
      statusByte1,
      statusByte2;

    this.beaconId = payload[0]; // 0x43
    if (this.beaconId !== 0x43)
      return -1;
      
    statusByte1 = payload[1];
    statusByte2 = payload[2];

    this.authenticationType = new AuthenticationType(payload[3]);

    this.dataAvailable        = statusByte1 & 0x20 ? true : false; // Bit 5
    this.uploadEnabled        = statusByte1 & 0x10 ? true : false; // Bit 4
    this.pairingEnabled       = statusByte1 & 0x08 ? true : false; // Bit 3
    this.beaconChannelPeriod  = statusByte1 & 0x7; // Bit 2-0

    this.clientDeviceState = new State(statusByte2 & 0x0F); // Bit 3-0 (0100-1111 reserved), bit 7-4 reserved

    if (this.clientDeviceState.isAuthentication() ||  this.clientDeviceState.isTransport() ||
      this.clientDeviceState.isBusy()) {

      this.hostSerialNumber = dv.getUint32(4+payload.byteOffset, true);

    } else if (this.clientDeviceState.isLink()) {

      this.deviceType = dv.getUint16(4+payload.byteOffset, true);
      this.manufacturerID = dv.getUint16(6+payload.byteOffset, true);

      if (this.manufacturerID & ClientBeacon.prototype.BIT_MASK.DEVICE_TYPE_MANAGED_BY)
        this.deviceTypeManagedBy = 'ANT+ Alliance';
      else
        this.deviceTypeManagedBy = 'Manufacturer';
    }

  };

  ClientBeacon.prototype.hasDataAvailable = function ()
  {
    return this.dataAvailable;
  };

  ClientBeacon.prototype.hasUploadEnabled = function ()
  {
    return this.uploadEnabled;
  };

  ClientBeacon.prototype.hasPairingEnabled = function ()
  {
    return this.pairingEnabled;
  };

  ClientBeacon.prototype.forHost = function (hostSN)
  {
    return this.hostSerialNumber === hostSN;
  };


  ClientBeacon.prototype.toString = function() {

    var str,
      statusByte1Str;

    statusByte1Str = 'ClientBeacon |';

    if (this.dataAvailable)
      statusByte1Str += '+Data ';
    else
      statusByte1Str += '-Data ';

    if (this.uploadEnabled)
      statusByte1Str += '+Upload ';
    else
      statusByte1Str += '-Upload ';

    if (this.pairingEnabled)
      statusByte1Str += '+Pairing ';
    else
      statusByte1Str += '-Pairing ';

    statusByte1Str += ' | Tch ';

    switch (this.beaconChannelPeriod) {
      case 0x00:
        statusByte1Str += '0.5 Hz';
        break;
      case 0x01:
        statusByte1Str += '1.0 Hz';
        break;
      case 0x02:
        statusByte1Str += '2.0 Hz';
        break;
      case 0x03:
        statusByte1Str += '4.0 Hz';
        break;
      case 0x04:
        statusByte1Str += '8.0 Hz';
        break;
      case 0x07:
        statusByte1Str += 'Match Established Channel Period';
    }

    str = statusByte1Str +' | State '  + this.clientDeviceState.toString();

    if (this.clientDeviceState.isLink()) {
      str += ' | Device type ' + this.deviceType + ' by ' + this.deviceTypeManagedBy + ' Manuf. ID '  +
       this.manufacturerID + ' | ' + this.authenticationType.toString();
    } else
      str += ' | Host SN. ' + this.hostSerialNumber + ' | ' +  this.authenticationType.toString();

    return str;
  };

  module.exports = ClientBeacon;
  return module.exports;
});
