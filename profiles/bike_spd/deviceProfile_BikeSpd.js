/* globals define: true, require: true */

define(['profiles/deviceProfile','settings','messages/HighPrioritySearchTimeout','messages/LowPrioritySearchTimeout','profiles/spdcad/SPDCADPage0','profiles/Page'],function (DeviceProfile, setting, LowPrioritySearchTimeout, HighPrioritySearchTimeout,BikeSpdPage0,GenericPage) {

    'use strict';

    function DeviceProfile_BikeSpd(configuration) {

        DeviceProfile.call(this, configuration);

        this.addConfiguration("slave", {
            description: "Slave configuration for ANT+ SPDCAD device profile",
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_BikeSpd.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            LPsearchTimeout: new LowPrioritySearchTimeout(LowPrioritySearchTimeout.prototype.MAX),
            HPsearchTimeout: new HighPrioritySearchTimeout(HighPrioritySearchTimeout.prototype.DISABLED),

            channelPeriod: DeviceProfile_BikeSpd.prototype.CHANNEL_PERIOD.DEFAULT

        });

        this.addConfiguration("master", {
            description: "Master configuration for ANT+ SDM device profile",
            networkKey: setting.networkKey["ANT+"],

            channelType: "master",
            channelId: { deviceNumber: 'serial number', deviceType: DeviceProfile_BikeSpd.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: DeviceProfile_BikeSpd.prototype.CHANNEL_ID.TRANSMISSION_TYPE },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +

            channelPeriod: DeviceProfile_BikeSpd.prototype.CHANNEL_PERIOD.DEFAULT

        });

        // Used for calculation of cadence and speed
        // Using an object literal allows for tracking multiple sensors by indexing with sensorId (based on channelId)
        this.previousPage = {};

        this.requestPageUpdate(DeviceProfile_BikeSpd.prototype.DEFAULT_PAGE_UPDATE_DELAY);
    }

    DeviceProfile_BikeSpd.prototype = Object.create(DeviceProfile.prototype);
    DeviceProfile_BikeSpd.prototype.constructor = DeviceProfile_BikeSpd;

    DeviceProfile_BikeSpd.prototype.DEFAULT_PAGE_UPDATE_DELAY = 1000;

    DeviceProfile_BikeSpd.prototype.NAME = 'BIKE_SPD';

    DeviceProfile_BikeSpd.prototype.CHANNEL_ID = {
        DEVICE_TYPE: 0x7B, // 123
        TRANSMISSION_TYPE: 1
    };

    DeviceProfile_BikeSpd.prototype.CHANNEL_PERIOD = {
        DEFAULT: 8118, // 4.06Hz
        //ALTERNATIVE_1: 16172,
     //   ALTERNATIVE_2: 32344
    };

    DeviceProfile_BikeSpd.prototype.WHEEL_CIRCUMFERENCE = 2.07; // in meter -> should be able to configure in a setting

    // BikeSpd one of the old device profiles without common pages conforming to the latest/"general" ANT+ message format
    DeviceProfile_BikeSpd.prototype.hasCommonPages = false;

    DeviceProfile_BikeSpd.prototype.broadCast = function (broadcast) {

        var page,
            pageNumber = data[0] && GenericPage.prototype.BIT_MASK.PAGE_NUMBER,
            data = broadcast.data,
            sensorId = broadcast.channelId.sensorId;

       // broadcast.profile = this;

        // Don't process broadcast with wrong device type
        if (!this.verifyDeviceType(DeviceProfile_BikeSpd.prototype.CHANNEL_ID.DEVICE_TYPE, broadcast))
            return;

        this.countBroadcast(sensorId);

        // Don't process duplicate broadcast
        if (this.isDuplicateMessage(broadcast)) {

            return;

        }

        switch (pageNumber)
        {
                case 0 :

                      page = new BikeSpdPage0({ log: this.log.logging }, broadcast, this.previousPage[sensorId]);

                      break;

                default :

                    if (this.log && this.log.logging)
                       this.log.log('warn','Cannot handle page '+this.number+'for device profile',this);

        }

       if (page) {

           if (this.log.logging) this.log.log('info', sensorId + ' B#' + this.receivedBroadcastCounter[sensorId], page, page.toString());

            this.addPage(page);

            this.previousPage[sensorId] = page;
       }

    };

    return DeviceProfile_BikeSpd;
});
