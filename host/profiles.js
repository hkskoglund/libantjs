'use strict';

var ANTFSHostChannel = require('../profiles/antfs/antfs-host-channel'),
  HRMProfile = require('../profiles/antplus/hrm/device-profile-hrm'),
  EnvironmentProfile = require('../profiles/antplus/environment/device-profile-environment'),
  LibConfig = require('../messages/extended/lib-config');

class HostProfiles {
  connectANTFS(channel, options, deviceNumber, hostname, download, erase, ls, skipNewFiles, onSearching) {
    var antfsOptions,
      antfsHost;

    if (typeof onSearching !== 'function' && typeof arguments[9] === 'function')
      onSearching = arguments[9];

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
        skipNewFiles: skipNewFiles,
        onSearching: onSearching
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
    antfsHost.connect(antfsOptions.onSearching);
  }

  connectANTPlusSensor(channelNumber, sensorType, options, callback) {
    var channel = this.channel[channelNumber],
      profile,
      deviceNumber,
      network,
      steps,
      completed = false;

    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};

    if (typeof callback !== 'function') {
      throw new TypeError('connectANTPlusSensor requires a callback');
    }

    if (!channel || !Number.isInteger(channelNumber) ||
        channelNumber < 0 || channelNumber >= this.channel.length) {
      callback(new RangeError('ANT channel ' + channelNumber + ' is unavailable'));
      return;
    }

    switch (sensorType) {
      case 'hrm':
        profile = HRMProfile.prototype;
        break;
      case 'tempe':
      case 'environment':
        profile = EnvironmentProfile.prototype;
        break;
      default:
        callback(new RangeError('Unsupported ANT+ sensor type: ' + sensorType));
        return;
    }

    deviceNumber = options.deviceNumber === undefined ? 0 : options.deviceNumber;
    network = options.net === undefined ? channel.net : options.net;

    steps = [
      function(next) {
        this.libConfig(LibConfig.CHANNEL_ID_ENABLED, next);
      }.bind(this),
      function(next) {
        channel.setNetworkKey(channel.NET.KEY['ANT+'], next);
      },
      function(next) {
        channel.assign(channel.SLAVE_RECEIVE_ONLY, network, next);
      },
      function(next) {
        channel.setId(deviceNumber, profile.CHANNEL_ID.DEVICE_TYPE, 0, next);
      },
      function(next) {
        channel.setFrequency(channel.NET.FREQUENCY['ANT+'], next);
      },
      function(next) {
        var period = sensorType === 'hrm' ?
          profile.CHANNEL_PERIOD.DEFAULT :
          profile.CHANNEL_PERIOD.ALTERNATIVE;
        channel.setPeriod(period, next);
      },
      function(next) {
        channel.open(next);
      }
    ];

    function finish(error) {
      if (completed) {
        return;
      }
      completed = true;
      callback(error, error ? undefined : channel);
    }

    function runStep(index) {
      if (index === steps.length) {
        finish();
        return;
      }

      try {
        steps[index](function(error) {
          if (error) {
            finish(error);
          } else {
            runStep(index + 1);
          }
        });
      } catch (error) {
        if (completed) {
          throw error;
        }
        finish(error);
      }
    }

    runStep(0);
    return channel;
  }

}

module.exports = function(Host) {
  for (const methodName of Object.getOwnPropertyNames(HostProfiles.prototype)) {
    if (methodName !== 'constructor') {
      Host.prototype[methodName] = HostProfiles.prototype[methodName];
    }
  }
};
