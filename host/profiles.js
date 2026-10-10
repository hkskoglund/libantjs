'use strict';
import ANTFSHostChannel from '../profiles/antfs/antfs-host-channel.js';
import HRMProfile from '../profiles/antplus/hrm/device-profile-hrm.js';
import EnvironmentProfile from '../profiles/antplus/environment/device-profile-environment.js';
import LibConfig from '../messages/extended/lib-config.js';



class HostProfiles {
  async connectANTFS(channel, options, deviceNumber, hostname, download, erase, ls, skipNewFiles) {
    var antfsOptions,
      antfsHost;

    if (options && typeof options === 'object' && !Array.isArray(options)) {
      antfsOptions = Object.assign({}, options);
    } else {
      antfsOptions = {
        net: options,
        deviceNumber: deviceNumber,
        hostname: hostname,
        download: download,
        erase: erase,
        ls: ls,
        skipNewFiles: skipNewFiles
      };
    }

    antfsOptions.log = this.options.log;
    antfsOptions.dataDir = this.options.dataDir;

    antfsHost = new ANTFSHostChannel(
      antfsOptions,
      this,
      channel
    );

    this.setChannel(antfsHost);
    await antfsHost.connect();

    return antfsHost;
  }

  async connectANTPlusSensor(channelNumber, sensorType, options) {
    var channel = this.channel[channelNumber],
      profile,
      deviceNumber,
      network;

    options = options || {};

    if (!channel || !Number.isInteger(channelNumber) ||
        channelNumber < 0 || channelNumber >= this.channel.length) {
      throw new RangeError('ANT channel ' + channelNumber + ' is unavailable');
    }

    switch (sensorType) {
      case 'hrm':
        profile = HRMProfile;
        break;
      case 'tempe':
      case 'environment':
        profile = EnvironmentProfile;
        break;
      default:
        throw new RangeError('Unsupported ANT+ sensor type: ' + sensorType);
    }

    deviceNumber = options.deviceNumber === undefined ? 0 : options.deviceNumber;
    network = options.net === undefined ? channel.net : options.net;

    const period = sensorType === 'hrm' ?
      profile.CHANNEL_PERIOD.DEFAULT :
      profile.CHANNEL_PERIOD.ALTERNATIVE;

    await this.libConfig(LibConfig.CHANNEL_ID_ENABLED);
    await channel.setNetworkKey(channel.constructor.NET.KEY['ANT+']);
    await channel.assign(channel.constructor.SLAVE_RECEIVE_ONLY, network);
    await channel.setId(deviceNumber, profile.CHANNEL_ID.DEVICE_TYPE, 0);
    await channel.setFrequency(channel.constructor.NET.FREQUENCY['ANT+']);
    await channel.setPeriod(period);
    await channel.open();

    return channel;
  }

}

export default function(Host) {
  for (const methodName of Object.getOwnPropertyNames(HostProfiles.prototype)) {
    if (methodName !== 'constructor') {
      Host.prototype[methodName] = HostProfiles.prototype[methodName];
    }
  }
};
