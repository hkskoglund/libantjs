/* global define: true */

define(function (require, exports, module) {
    'use strict';

    //
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

        // Temperature profile to be used by all temperature sensors

        this.temperatureProfile = new TEMPProfile({ log: this.log.logging, onPage: configuration.onPage });

        this.SDMProfile = new SDMProfile({ log: this.log.logging, onPage: configuration.onPage });

        this.HRMProfile = new HRMProfile({ log: this.log.logging, onPage: configuration.onPage });

        this.SPDCADProfile = new SPDCADProfile({ log: this.log.logging, onPage: configuration.onPage });


    }

    RxScanMode.prototype = Object.create(DeviceProfile.prototype);
    RxScanMode.constructor = RxScanMode;

    RxScanMode.prototype.broadCast = function (broadcast) {
        if (!broadcast) {
            this.log.log('error', 'Undefined broadcast received');
            return;
        }

        if (!broadcast.channelId) {
            this.log.log('error', 'No channel id available for broadcast', broadcast);
            return;
        }

        // this.log.log('log',broadcast.channelId.toString(), broadcast.channelId);

        switch (broadcast.channelId.deviceType) {

            case TEMPProfile.prototype.CHANNEL_ID.DEVICE_TYPE:

                this.temperatureProfile.broadCast(broadcast);

                break;

            case HRMProfile.prototype.DEVICE_TYPE:

                this.HRMProfile.broadCast(broadcast);

                break;

            case SDMProfile.prototype.CHANNEL_ID.DEVICE_TYPE:

               
                this.SDMProfile.broadCast(broadcast);

                break;
                
            case SPDCADProfile.prototype.CHANNEL_ID.DEVICE_TYPE :   
               
                this.SPDCADProfile.broadCast(broadcast);
                break;
          
            default:
                if (this.log.logging)
                    this.log.log('warn', 'Parsing not enabled, received', broadcast.data, 'from ' + broadcast.channelId.toString());
                break;
        }

    };


    module.exports = RxScanMode;
    return module.exports;
});
