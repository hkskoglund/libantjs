"use strict";

var DeviceProfile = require('./deviceProfile.js');
var DeviceProfile_HRM = require('./deviceProfile_HRM.js');
var DeviceProfile_SDM = require('./deviceProfile_SDM.js');
var DeviceProfile_SPDCAD = require('./deviceProfile_SPDCAD.js');
var CRC = require('../crc.js');
var ANT = require('libant');
var fs = require('fs');
var Channel = require('../channel.js');
var Network = require('../network.js');
var util = require('util');


function BackgroundScanningChannel(configuration) {
    DeviceProfile.call(this); 
    this._configuration = configuration;
}

//BackgroundScanningChannel.prototype = Object.create(DeviceProfile.prototype);  

//BackgroundScanningChannel.prototype.constructor = BackgroundScanningChannel;  

util.inherits(BackgroundScanningChannel, DeviceProfile);

BackgroundScanningChannel.prototype.getSlaveChannelConfiguration = function (config) {
    // networkNr, channelNr, deviceNr, deviceType, transmissionType, lowPrioritySearchTimeout
    // Setup channel parameters for background scanning
    //console.log("Low priority search timeout", lowPrioritySearchTimeout);
    var broadCastDataParserFunc,
        channelResponseEventFunc;

    this.channel = new Channel(config.channelNr, Channel.prototype.CHANNEL_TYPE.receive_only_channel, config.networkNr, this._configuration.network_keys.ANT_PLUS);

    this.channel.setExtendedAssignment(Channel.prototype.EXTENDED_ASSIGNMENT.BACKGROUND_SCANNING_ENABLE);
    this.channel.setChannelId(config.deviceNr, config.deviceType, config.transmissionType, false);
    //this.channel.setChannelPeriod(DeviceProfile_ANTFS.prototype.CHANNEL_PERIOD);
    this.channel.setLowPrioritySearchTimeout(config.searchTimeoutLP);
   
    if (config.searchTimeoutHP !== 0x00) {
        console.log(Date.now(), "High priority search timeout is not disabled = "+config.searchTimeoutHP.toString(16)+" , forced disable = 0x00 for background scanning");
        config.searchTimeoutHP = 0x00;
    }
    this.channel.setChannelSearchTimeout(config.searchTimeoutHP); // Disable High priority search
    this.channel.setChannelFrequency(this._configuration.frequency.ANT_PLUS);
    //this.channel.setChannelSearchWaveform(DeviceProfile_ANTFS.prototype.SEARCH_WAVEFORM);

    broadCastDataParserFunc = this.broadCastDataParser || DeviceProfile.prototype.broadCastDataParser;
    channelResponseEventFunc = this.channelResponseEvent || DeviceProfile.prototype.channelResponseEvent;

    this.channel.addListener(Channel.prototype.EVENT.CHANNEL_RESPONSE_EVENT, channelResponseEventFunc.bind(this));
    this.channel.addListener(Channel.prototype.EVENT.BROADCAST, broadCastDataParserFunc.bind(this));

   // console.log("BACKGROUND CHANNEL",this.channel);

    return this.channel;
};

BackgroundScanningChannel.prototype.broadCastDataParser = function (data) {
    //console.log(Date.now() + " Background scanning channel BROADCAST : ", data, this.channel.channelID);
    //return;
    //channelID:
    //    { channelNumber: 0,
    //        deviceNumber: 51144,
    //        deviceTypeID: 124,
    //        transmissionType: 1,
    // TO DO : open channel for  this.channelID device profile

    var deviceProfile,
        self = this,
        channelID = this.channel.channelID;

    var openChannel = function (channelNr) {
        // Math.round(25 / 2.5)
        var searchTimeoutLP = 0x00,
            searchTimeoutHP = 0x00; // Device is newly found, seems reasonable with a short timeout

        // Observation : It seems like the channel is kept open regardless of timeouts, maybe its because the channelID was first found
        // by the background search channel? Verified : closing background search channel will give the normal
        // sequence of EVENT_RX_FAIL,EVENT_RX_FAIL_GO_TO_SEARCH,EVENT_RX_SEARCH_TIMEOUT,EVENT_CHANNEL_CLOSED

        self.ANT.setChannelConfiguration(channelNr, deviceProfile.getSlaveChannelConfiguration(Network.prototype.ANT,
                channelNr, channelID.deviceNumber, channelID.transmissionType, searchTimeoutHP, searchTimeoutLP));
        self.ANT.activateChannelConfiguration(channelNr, function error(err) { console.log(Date.now(), "Could not activate channel configuration", err); },
            function successCB(data) {
                //self.nodeInstance.ANT.close(0, function error(err) { console.log(Date.now(), "Failed to close background search channel"); },
                // function successCB() {
                self.ANT.open(channelNr, function error(err) { console.log(Date.now(), "Could not open channel", self.channel.channelID, err); },
                        function success(data) {
                            //console.log(Date.now(), "Channel open for profile " + deviceProfile.NAME);
                        }
                        , true);
                //  },true);
            });
    }

    var configuredChannel = function (channelNr, deviceType) {
        // Only open 1 channel to a specific device type - first come, first served
        //console.log(self.nodeInstance.ANT.channelConfiguration[channelNr]);
        return (typeof self.ANT.channelConfiguration !== "undefined" &&
            typeof self.ANT.channelConfiguration[channelNr] !== "undefined" &&
            self.ANT.channelConfiguration[channelNr].channelID.deviceType === deviceType);
    }

    switch (channelID.deviceTypeID) {

        case DeviceProfile_HRM.prototype.DEVICE_TYPE:

            // By convention when a master is found and a new channel is created/opened to handle broadcasts,
            // the background channel search will not trigger anymore on this particular master, but can trigger on same device type.
            // Only one channel pr. device type is allocated

            console.log(Date.now(), "Found HRM - heart rate monitor - master/sensor")
            console.log(Date.now(), channelID.toString());

            if (configuredChannel(1,channelID.deviceTypeID))
                console.log(Date.now(), "Already configured channel to receive broadcast from device type/HRM");
            else {
                deviceProfile = new DeviceProfile_HRM(this.getConfiguration());
                openChannel(1);
                //setTimeout(function () {
                //    console.log(Date.now(), "Calling broadcast data paser for testing of registering of a new HRM device");
                //    self.broadCastDataParser(data);
                //}, 1000);
            }
            break;

        case DeviceProfile_SDM.prototype.DEVICE_TYPE:

            console.log(Date.now(), "Found SDM4 - foot pod - master/sensor");
            console.log(Date.now(), this.channelID.toString());
            if (configuredChannel(2, this.channelID.deviceTypeID))
                console.log(Data.now(), "Already configured channel to receive broadcast from device type/SDM");
            else {
                deviceProfile = new DeviceProfile_SDM(this.nodeInstance);
                openChannel(2);
            }
            break;

        case DeviceProfile_SPDCAD.prototype.DEVICE_TYPE:

            console.log(Date.now(), "Found SPDCAD - bike speed/cadence - master/sensor");
            console.log(Date.now(), this.channelID.toString());
            if (configuredChannel(3, this.channelID.deviceTypeID))
                console.log(Data.now(), "Already configured channel to receive broadcast from device type/SPDCAD");
            else {
                deviceProfile = new DeviceProfile_SPDCAD(this.nodeInstance);
                openChannel(3);
            }

            break;

        default:
            console.log(Date.now() + "Found ANT device type", this.channelID.deviceTypeID, " device profile not implemented/supported");
            break;
    }

};

BackgroundScanningChannel.prototype.channelResponseEvent = function (data) {
    //console.log(Date.now() + " Background scanning channel RESPONSE/EVENT : ", data);
};


module.exports = BackgroundScanningChannel;
