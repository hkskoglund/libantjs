'use strict';

const State = require('./util/state'),
  AuthenticationType = require('./util/authentication-type');

class ClientBeacon {
  constructor(payload) {
    if (payload)
      this.decode(payload);

    this.clientDeviceState = 'UNKNOWN';
  }

  decode(payload) {
    const dv = new DataView(payload.buffer);
    const statusByte1 = payload[1];
    const statusByte2 = payload[2];

    this.beaconId = payload[0]; // 0x43
    if (this.beaconId !== 0x43)
      return -1;

    this.authenticationType = new AuthenticationType(payload[3]);
    this.dataAvailable = Boolean(statusByte1 & 0x20);
    this.uploadEnabled = Boolean(statusByte1 & 0x10);
    this.pairingEnabled = Boolean(statusByte1 & 0x08);
    this.beaconChannelPeriod = statusByte1 & 0x07;
    this.clientDeviceState = new State(statusByte2 & 0x0F);

    if (this.clientDeviceState.isAuthentication() || this.clientDeviceState.isTransport() ||
      this.clientDeviceState.isBusy()) {
      this.hostSerialNumber = dv.getUint32(4 + payload.byteOffset, true);
    } else if (this.clientDeviceState.isLink()) {
      this.deviceType = dv.getUint16(4 + payload.byteOffset, true);
      this.manufacturerID = dv.getUint16(6 + payload.byteOffset, true);

      if (this.manufacturerID & ClientBeacon.prototype.BIT_MASK.DEVICE_TYPE_MANAGED_BY)
        this.deviceTypeManagedBy = 'ANT+ Alliance';
      else
        this.deviceTypeManagedBy = 'Manufacturer';
    }
  }

  hasDataAvailable() {
    return this.dataAvailable;
  }

  hasUploadEnabled() {
    return this.uploadEnabled;
  }

  hasPairingEnabled() {
    return this.pairingEnabled;
  }

  forHost(hostSN) {
    return this.hostSerialNumber === hostSN;
  }

  toString() {
    let str,
      statusByte1Str = 'ClientBeacon |';

    statusByte1Str += this.dataAvailable ? '+Data ' : '-Data ';
    statusByte1Str += this.uploadEnabled ? '+Upload ' : '-Upload ';
    statusByte1Str += this.pairingEnabled ? '+Pairing ' : '-Pairing ';
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

    str = statusByte1Str + ' | State ' + this.clientDeviceState.toString();

    if (this.clientDeviceState.isLink()) {
      str += ' | Device type ' + this.deviceType + ' by ' + this.deviceTypeManagedBy + ' Manufacturer ' +
        this.manufacturerID + ' | ' + this.authenticationType.toString();
    } else {
      str += ' | Host ' + this.hostSerialNumber + ' | ' + this.authenticationType.toString();
    }

    return str;
  }
}

ClientBeacon.prototype.PAYLOAD_LENGTH = 0x08;
ClientBeacon.prototype.BIT_MASK = {
  DATA_AVAILABLE: 0x20,
  UPLOAD_ENABLED: 0x10,
  PAIRING_ENABLED: 0x08,
  BEACON_CHANNEL_PERIOD: 0x07,
  DEVICE_TYPE_MANAGED_BY: 0x8000
};
ClientBeacon.prototype.CHANNEL_PERIOD = {
  Hz05: 0x00,
  Hz1: 0x01,
  Hz2: 0x02,
  Hz4: 0x03,
  Hz8: 0x04
};

module.exports = ClientBeacon;
