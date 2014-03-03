/* global define: true */

define(function (require, exports, module) {
    'use strict';

    var DeviceProfile = require('profiles/deviceProfile'),
        setting = require('settings'),
        TEMPProfile = require('profiles/environment/deviceProfile_ENVIRONMENT'),
        HRMProfile = require('profiles/hrm/deviceProfile_HRM'),
        SDMProfile = require('profiles/sdm/deviceProfile_SDM'),
        SPDCADProfile = require('profiles/spdcad/deviceProfile_SPDCAD');


    function RxScanMode(configuration) {
        var devNum = '*',
            devType = '*',
            transType = '*';
            

        DeviceProfile.call(this, configuration);

        if (configuration.channelId) {
            devNum = configuration.channelId.deviceNumber || '*';
            devType = configuration.channelId.deviceType || '*';
            transType = configuration.channelId.transmissionType || '*';
        }

        this.addConfiguration("slave", {
            description: "Slave configuration Rx Scan Mode for ANT+ devices",
            networkKey: setting.networkKey["ANT+"],
            channelType: "slave",
            channelId: { deviceNumber: devNum, deviceType: devType, transmissionType: transType },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            RxScanMode: true
        });

        this.addConfiguration("slave only", {
            description: "Slave only configuration Rx Scan Mode for ANT+ devices",
            networkKey: setting.networkKey["ANT+"],
            channelType: "slave only",
            channelId: { deviceNumber: devNum, deviceType: devType, transmissionType: transType },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            RxScanMode: true
        });

        this.profile = {}; // indexed by device type

        this.addProfile(new TEMPProfile({ log: this.log.logging }));
        this.addProfile(new SDMProfile({ log: this.log.logging}));
        this.addProfile(new HRMProfile({ log: this.log.logging }));
        this.addProfile(new SPDCADProfile({ log: this.log.logging }));

    }

    RxScanMode.prototype = Object.create(DeviceProfile.prototype);
    RxScanMode.constructor = RxScanMode;

    // Override default stop of device profile
    RxScanMode.prototype.stop = function ()
    {
        this.removeAllEventListeners('page'); // In case someone is listening on our page event

        for (var devType in this.profile)
        {
            this.profile[devType].stop();
        }
    }

    RxScanMode.prototype.onPage = function (page)
    {
        this.emit('page',page);
    }

    RxScanMode.prototype.addProfile = function (profile) {
        var deviceType;
        if (profile) {
            deviceType = profile.CHANNEL_ID.DEVICE_TYPE;
            if (deviceType === undefined || deviceType === null) {
                if (this.log.logging)
                    this.log.log('error', 'Could not retrive device type channel id on profile', profile);

            } else {
                this.profile[deviceType] = profile;
                
                profile.addEventListener('page',this.onPage.bind(this)); // Forward

                if (this.log.logging)
                    this.log.log('info', 'Added profile for device type '+deviceType+' to RX SCAN mode channel', profile);
            }
        }
        else if (this.log.logging)
            this.log.log('error', 'Attempt to add an Undefined or Null profile is not allowed');
    }

    // Scan mode receives all broadcasts on channel 0 
    // The broadcast is forwared to a particular device profile (for parsing of page) based on the device type in the channel id
    RxScanMode.prototype.broadCast = function (broadcast) {
        var currentProfile;
        if (!broadcast) {
            this.log.log('error', 'Undefined broadcast received');
            return;
        }

        if (!broadcast.channelId) {
            this.log.log('error', 'No channel id available for broadcast', broadcast);
            return;
        }

        // this.log.log('log',broadcast.channelId.toString(), broadcast.channelId);

        currentProfile = this.profile[broadcast.channelId.deviceType];

        if (currentProfile) // Forward
            currentProfile.broadCast(broadcast);
        else
            if (this.log.logging)
                this.log.log('warn', 'No profile registered for device type on RX SCAN channel', broadcast.data, 'from ' + broadcast.channelId.toString());

    };

    module.exports = RxScanMode;
    return module.exports;
});
