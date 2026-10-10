'use strict';
import DeviceProfile from './device-profile.js';
import TEMPProfile from './environment/device-profile-environment.js';
import HRMProfile from './hrm/device-profile-hrm.js';
import SPDCADProfile from './bike-spdcad/device-profile-spdcad.js';
import BikeSpdProfile from './bike-spd/device-profile-bike-spd.js';
import BikeCadProfile from './bike-cad/device-profile-bike-cad.js';
import BikePowerProfile from './bike-power/device-profile-bike-power.js';

const modules = [
  DeviceProfile,
  TEMPProfile,
  HRMProfile,
  SPDCADProfile,
  BikeSpdProfile,
  BikeCadProfile,
  BikePowerProfile
];

  // Just in case errors with loading

  for (var moduleNr = 0; moduleNr < modules.length; moduleNr++) {
    if (modules[moduleNr] === undefined) {
      console.error('RXScanMode: Undefined module at argument nr', moduleNr);
    }
  }

  class RxScanMode extends DeviceProfile {
  constructor(configuration) {


    var devNum = 0,
      devType = 0,
      transType = 0;

    super(configuration);

    if (configuration && configuration.channelId) {
      devNum = configuration.channelId.deviceNumber || 0;
      devType = configuration.channelId.deviceType || 0;
      transType = configuration.channelId.transmissionType || 0;
    }

    this.addConfiguration("slave", {
      description: "Slave configuration Rx Scan Mode for ANT+ devices",
      networkKey: setting.networkKey["ANT+"],
      channelType: "slave",
      channelId: {
        deviceNumber: devNum,
        deviceType: devType,
        transmissionType: transType
      },
      RFfrequency: setting.RFfrequency["ANT+"], // 2457 Mhz ANT +
      RxScanMode: true
    });

    this.addConfiguration("slave only", {
      description: "Slave only configuration Rx Scan Mode for ANT+ devices",
      networkKey: setting.networkKey["ANT+"],
      channelType: "slave only",
      channelId: {
        deviceNumber: devNum,
        deviceType: devType,
        transmissionType: transType
      },
      RFfrequency: setting.RFfrequency["ANT+"], // 2457 Mhz ANT +
      RxScanMode: true
    });

    this.profile = {}; // indexed by sensorId
  }

  stop() {

    this.removeAllListeners('page'); // In case someone is listening on our page event

    for (var sensorId in this.profile) {
      this.profile[sensorId].stop();
    }
  }

  onPage(page) {

    this.emit('page', page);
  }

  addProfile(profile, broadcast) {


    var sensorId = broadcast.channelId.sensorId;

    this.profile[sensorId] = profile;

    profile.addListener('page', this.onPage.bind(this)); // Forward

    if (this.log.logging) {
      this.log.info( 'Added profile for sensorId ' + sensorId + ' to RX SCAN mode channel', profile);
    }
  }

  broadCast(broadcast) {


    var currentProfile;

    if (!broadcast) {
      this.log.error( 'Undefined broadcast received');
      return;
    }

    if (!broadcast.channelId) {
      this.log.error( 'No channel id available for broadcast', broadcast);
      return;
    }

    currentProfile = this.profile[broadcast.channelId.sensorId];

    if (currentProfile) { // Forward
      currentProfile.broadCast(broadcast);
    } else {

      // Creating a new profile for each new sensor simplifies the code
      // When sharing a profile object among several sensor of the same type, every
      // datastructure inside the profile must by indexed by sensorId, e.g this.broadcast[sensorId]

      switch (broadcast.channelId.deviceType) {
        case SPDCADProfile.prototype.CHANNEL_ID.DEVICE_TYPE:

          currentProfile = new SPDCADProfile({
            logger: this.log
          });
          break;

        case BikeSpdProfile.prototype.CHANNEL_ID.DEVICE_TYPE:

          currentProfile = new BikeSpdProfile({
            logger: this.log
          });
          break;


        case BikeCadProfile.prototype.CHANNEL_ID.DEVICE_TYPE:

          currentProfile = new BikeCadProfile({
            logger: this.log
          });
          break;


        case TEMPProfile.prototype.CHANNEL_ID.DEVICE_TYPE:

          currentProfile = new TEMPProfile({
            logger: this.log
          });
          break;

        case HRMProfile.prototype.CHANNEL_ID.DEVICE_TYPE:

          currentProfile = new HRMProfile({
            logger: this.log
          });
          break;

        case BikePowerProfile.prototype.CHANNEL_ID.DEVICE_TYPE:

          currentProfile = new BikePowerProfile({
            logger: this.log
          });

          break;

        default:

          if (this.log && this.log.logging) {
            this.log.warn( 'No profile support for device type ' + broadcast.channelId.deviceType);
          }
          break;

      }

      if (currentProfile) {
        this.addProfile(currentProfile, broadcast);
        currentProfile.broadCast(broadcast);
      }
    }
  }
}




  // Override default stop of device profile






  // Scan mode receives all broadcasts on channel 0
  // The broadcast is forwared to a particular device profile (for parsing of page) based on the sensorId


  export default RxScanMode;
