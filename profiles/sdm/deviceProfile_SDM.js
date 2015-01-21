define(function (require, exports, module) {
    'use strict';

    var DeviceProfile = require('profiles/deviceProfile'),
        setting = require('settings'),
        HighPrioritySearchTimeout = require('messages/HighPrioritySearchTimeout'),
        LowPrioritySearchTimeout = require('messages/LowPrioritySearchTimeout'),
        SDMPage1 = require('profiles/sdm/SDMPage1'),
        SDMPage2 = require('profiles/sdm/SDMPage2'),
        GenericPage = require('profiles/Page');


    function DeviceProfile_SDM(configuration) {

        DeviceProfile.call(this, configuration);

        this.addConfiguration("slave", {
            description: "Slave configuration for ANT+ SDM device profile",
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_SDM.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            LPsearchTimeout: new LowPrioritySearchTimeout(LowPrioritySearchTimeout.prototype.MAX),
            HPsearchTimeout: new HighPrioritySearchTimeout(HighPrioritySearchTimeout.prototype.DISABLED),

            channelPeriod: DeviceProfile_SDM.prototype.CHANNEL_PERIOD

        });

        this.addConfiguration("master", {
            description: "Master configuration for ANT+ SDM device profile",
            networkKey: setting.networkKey["ANT+"],

            channelType: "master",
            channelId: { deviceNumber: 'serial number', deviceType: DeviceProfile_SDM.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: DeviceProfile_SDM.prototype.CHANNEL_ID.TRANSMISSION_TYPE },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +

            channelPeriod: DeviceProfile_SDM.prototype.CHANNEL_PERIOD

        });

        // Minimize GC
        this.SDMPage1 = new SDMPage1(configuration);
        this.SDMPage2 = new SDMPage2(configuration);
        this.genericPage = new GenericPage(configuration);

    }

    DeviceProfile_SDM.prototype = Object.create(DeviceProfile.prototype);
    DeviceProfile_SDM.prototype.constructor = DeviceProfile_SDM;

    //util.inherits(DeviceProfile_SDM, DeviceProfile);

    DeviceProfile_SDM.prototype.NAME = 'SDM';

    DeviceProfile_SDM.prototype.CHANNEL_ID = {
        DEVICE_TYPE: 0x7C,
        TRANSMISSION_TYPE: 1
    };

    DeviceProfile_SDM.prototype.CHANNEL_PERIOD = 8134; // 4 hz

    DeviceProfile_SDM.prototype.ALTERNATIVE_CHANNEL_PERIOD = 16268;  // 2 Hz

    DeviceProfile_SDM.prototype.broadCast = function (broadcast) {
        //    var  data = broadcast.data,
        //         dataView = new DataView(data.buffer);

        //                 

        var page,
            pageNumber = broadcast.data[0],
            sensorId = broadcast.channelId.sensorId,
            pageIdentifier = sensorId + '.' + pageNumber,
            BROADCAST_LIMIT_BEFORE_UI_UPDATE = 4; // ca 1 second with ca 4 Hz period

        // Don't process broadcast with wrong device type
        if (!this.verifyDeviceType(DeviceProfile_SDM.prototype.CHANNEL_ID.DEVICE_TYPE, broadcast))
            return;

        this.countBroadcast(sensorId);

        // Don't process duplicate broadcast
        if (this.isDuplicateMessage(broadcast)) {


            return;

        }

        switch (pageNumber) {


            case 1:

                // page = new SDMPage1({ log: this.log.logging }, broadcast);
                page = this.SDMPage1;
                page.parse(broadcast);
               
                break;


            case 2:

                // page = new SDMPage2({ log: this.log.logging }, broadcast);
                page = this.SDMPage2;
                page.parse(broadcast);

                break;

            default:

                // Check for common page 80,...
                page = this.genericPage;
                if (page.parse(broadcast) === -1) // Not a common page
                {
                    // Issue : Receive page 2 for temp sensor (does not exist)
                    //  May indicate that a broadcast from another sensor is sent with the wrong channelId in extended data...
                    // Page 2 should be page 1 -> maybe a bit error?, CRC is OK
                    if (this.log.logging) this.log.log('error', 'Failed to parse page ' + page.number + ' broadcast', broadcast.toString());
                    page = undefined;
                }

                break;

        }

        if (page) {

            page.timestamp = Date.now();

            if (this.log.logging) this.log.log('info', sensorId + ' B#' + this.receivedBroadcastCounter[sensorId], page, page.toString());

            if (this.receivedBroadcastCounter[sensorId] >= BROADCAST_LIMIT_BEFORE_UI_UPDATE)
                this.onPage(page);
            else if (this.log.logging)
                this.log.log('warn', 'Skipping page, broadcast for SDM sensor ' + sensorId + ' is ' + this.receivedBroadcastCounter[sensorId] + ' which is  threshold for UI update ' + BROADCAST_LIMIT_BEFORE_UI_UPDATE);

        }


    };

    module.exports = DeviceProfile_SDM;
    return module.exports;
});
