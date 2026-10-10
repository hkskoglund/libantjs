'use strict';
import DeviceProfile from './device-profile.js';
import DeviceProfile_HRM from './device-profile-hrm.js';
import DeviceProfile_SDM from './device-profile-sdm.js';
import DeviceProfile_SPDCAD from './device-profile-spdcad.js';
import Channel from '../channel.js';
import Network from '../network.js';








class BackgroundScanningChannel extends DeviceProfile {
  constructor(configuration) {

    super(configuration);
    this._configuration = configuration;
  }

  getSlaveChannelConfiguration(config) {

    // networkNr, channelNr, deviceNr, deviceType, transmissionType, lowPrioritySearchTimeout
    // Setup channel parameters for background scanning
    var broadCastDataParserFunc,
      channelResponseEventFunc;

    this.channel = new Channel(config.channelNr, Channel.prototype.CHANNEL_TYPE.receive_only_channel, config.networkNr, this._configuration.network_keys.ANT_PLUS);

    this.channel.setExtendedAssignment(Channel.prototype.EXTENDED_ASSIGNMENT.BACKGROUND_SCANNING_ENABLE);
    this.channel.setChannelId(config.deviceNr, config.deviceType, config.transmissionType, false);
    this.channel.setLowPrioritySearchTimeout(config.searchTimeoutLP);

    if (config.searchTimeoutHP !== 0x00) {
      this.log.debug( Date.now(), "High priority search timeout is not disabled = " + config.searchTimeoutHP.toString(16) + " , forced disable = 0x00 for background scanning");
      config.searchTimeoutHP = 0x00;
    }
    this.channel.setChannelSearchTimeout(config.searchTimeoutHP); // Disable High priority search
    this.channel.setChannelFrequency(this._configuration.frequency.ANT_PLUS);

    broadCastDataParserFunc = this.broadCastDataParser || DeviceProfile.prototype.broadCastDataParser;
    channelResponseEventFunc = this.channelResponseEvent || DeviceProfile.prototype.channelResponseEvent;

    this.channel.addListener(Channel.EVENT.CHANNEL_RESPONSE_EVENT, channelResponseEventFunc.bind(this));
    this.channel.addListener(Channel.EVENT.BROADCAST, broadCastDataParserFunc.bind(this));


    return this.channel;
  }

  broadCastDataParser(data) {

    //channelID:
    //    { channelNumber: 0,
    //        deviceNumber: 51144,
    //        deviceTypeID: 124,
    //        transmissionType: 1,
    // TO DO : open channel for  this.channelID device profile

    var deviceProfile,
      self = this,
      channelID = this.channel.channelID;

    var openChannel = function(channelNr) {
        // Math.round(25 / 2.5)
        var searchTimeoutLP = 0x00,
          searchTimeoutHP = 0x00; // Device is newly found, seems reasonable with a short timeout

        // Observation : It seems like the channel is kept open regardless of timeouts, maybe its because the channelID was first found
        // by the background search channel? Verified : closing background search channel will give the normal
        // sequence of EVENT_RX_FAIL,EVENT_RX_FAIL_GO_TO_SEARCH,EVENT_RX_SEARCH_TIMEOUT,EVENT_CHANNEL_CLOSED

        self.ANT.setChannelConfiguration(channelNr, deviceProfile.getSlaveChannelConfiguration(Network.prototype.ANT,
          channelNr, channelID.deviceNumber, channelID.transmissionType, searchTimeoutHP, searchTimeoutLP));
        self.ANT.activateChannelConfiguration(channelNr, function error(err) {
            self.log.debug( Date.now(), "Could not activate channel configuration", err);
          },
          function successCB(data) {
            self.ANT.open(channelNr, function error(err) {
                self.log.debug( Date.now(), "Could not open channel", self.channel.channelID, err);
              },
              function success(data) {
              }, true);
          });
    };

    var configuredChannel = function(channelNr, deviceType) {
      // Only open 1 channel to a specific device type - first come, first served
      return (typeof self.ANT.channelConfiguration !== "undefined" &&
        typeof self.ANT.channelConfiguration[channelNr] !== "undefined" &&
        self.ANT.channelConfiguration[channelNr].channelID.deviceType === deviceType);
    };

        switch (channelID.deviceTypeID) {

          case DeviceProfile_HRM.prototype.DEVICE_TYPE:

            // By convention when a master is found and a new channel is created/opened to handle broadcasts,
            // the background channel search will not trigger anymore on this particular master, but can trigger on same device type.
            // Only one channel pr. device type is allocated

            self.log.debug( Date.now(), "Found HRM - heart rate monitor - master/sensor")
            self.log.debug( Date.now(), channelID.toString());

            if (configuredChannel(1, channelID.deviceTypeID))
              self.log.debug( Date.now(), "Already configured channel to receive broadcast from device type/HRM");
            else {
              deviceProfile = new DeviceProfile_HRM(this.getConfiguration());
              openChannel(1);
            }
            break;

          case DeviceProfile_SDM.prototype.DEVICE_TYPE:

            self.log.debug( Date.now(), "Found SDM4 - foot pod - master/sensor");
            self.log.debug( Date.now(), channelID.toString());
            if (configuredChannel(2, channelID.deviceTypeID))
              self.log.debug( Date.now(), "Already configured channel to receive broadcast from device type/SDM");
            else {
              deviceProfile = new DeviceProfile_SDM(this.nodeInstance);
              openChannel(2);
            }
            break;

          case DeviceProfile_SPDCAD.prototype.DEVICE_TYPE:

            self.log.debug( Date.now(), "Found SPDCAD - bike speed/cadence - master/sensor");
            self.log.debug( Date.now(), channelID.toString());
            if (configuredChannel(3, channelID.deviceTypeID))
              self.log.debug( Date.now(), "Already configured channel to receive broadcast from device type/SPDCAD");
            else {
              deviceProfile = new DeviceProfile_SPDCAD(this.nodeInstance);
              openChannel(3);
            }
            break;

          default:
            self.log.debug( Date.now() + "Found ANT device type", this.channelID.deviceTypeID, " device profile not implemented/supported");
            break;
        }
  }

  channelResponseEvent(data) {}
}

  export default BackgroundScanningChannel;