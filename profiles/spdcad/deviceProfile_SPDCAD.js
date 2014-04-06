/* globals define: true, require: true */

define(['profiles/deviceProfile','settings','messages/HighPrioritySearchTimeout','messages/LowPrioritySearchTimeout','profiles/spdcad/SPDCADPage0','profiles/Page'],function (DeviceProfile, setting, LowPrioritySearchTimeout, HighPrioritySearchTimeout,SPDCADPage0,GenericPage) {

    'use strict';

    function DeviceProfile_SPDCAD(configuration) {

        DeviceProfile.call(this, configuration);

        this.addConfiguration("slave", {
            description: "Slave configuration for ANT+ SPDCAD device profile",
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_SPDCAD.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            LPsearchTimeout: new LowPrioritySearchTimeout(LowPrioritySearchTimeout.prototype.MAX),
            HPsearchTimeout: new HighPrioritySearchTimeout(HighPrioritySearchTimeout.prototype.DISABLED),

            channelPeriod: DeviceProfile_SPDCAD.prototype.CHANNEL_PERIOD.DEFAULT

        });

        this.addConfiguration("master", {
            description: "Master configuration for ANT+ SDM device profile",
            networkKey: setting.networkKey["ANT+"],

            channelType: "master",
            channelId: { deviceNumber: 'serial number', deviceType: DeviceProfile_SPDCAD.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: DeviceProfile_SPDCAD.prototype.CHANNEL_ID.TRANSMISSION_TYPE },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +

            channelPeriod: DeviceProfile_SPDCAD.prototype.CHANNEL_PERIOD.DEFAULT

        });

        // Used for calculation of cadence and speed
        // Using an object literal allows for tracking multiple sensors by indexing with sensorId (based on channelId)
        this.previousPage = {};

        this.requestPageUpdate(DeviceProfile_SPDCAD.prototype.DEFAULT_PAGE_UPDATE_DELAY);
    }

    DeviceProfile_SPDCAD.prototype = Object.create(DeviceProfile.prototype);
    DeviceProfile_SPDCAD.prototype.constructor = DeviceProfile_SPDCAD;

    DeviceProfile_SPDCAD.prototype.DEFAULT_PAGE_UPDATE_DELAY = 1000;

    DeviceProfile_SPDCAD.prototype.NAME = 'SPDCAD';

    DeviceProfile_SPDCAD.prototype.CHANNEL_ID = {
        DEVICE_TYPE: 0x79, // 121
        TRANSMISSION_TYPE: 1
    };

    DeviceProfile_SPDCAD.prototype.CHANNEL_PERIOD = {
        DEFAULT: 8086, // Ca. 4 messages pr. sec.
        ALTERNATIVE_1: 16172, // 2 msg/sec
        ALTERNATIVE_2: 32344 // 1 msg/sec
    };

    DeviceProfile_SPDCAD.prototype.WHEEL_CIRCUMFERENCE = 2.07; // in meter -> should be able to configure in a setting

    // SPDCAD one of the old device profiles without common pages conforming to the ANT+ message format
    DeviceProfile_SPDCAD.prototype.hasCommonPages = false;

    DeviceProfile_SPDCAD.prototype.broadCast = function (broadcast) {

        var page,
            // Spec p. 34  "The combined bike speed and cadence data format was one of the first defined ANT+ message format and 
            // does not conform to the standard ANT+ message definition"
         sensorId = broadcast.channelId.sensorId;

       // broadcast.profile = this;
            
        // Don't process broadcast with wrong device type
        if (!this.verifyDeviceType(DeviceProfile_SPDCAD.prototype.CHANNEL_ID.DEVICE_TYPE, broadcast))
            return;

        this.countBroadcast(sensorId);

        // Don't process duplicate broadcast
        if (this.isDuplicateMessage(broadcast)) {


            return;

        }

        page = new SPDCADPage0({ log: this.log.logging }, broadcast, this.previousPage[sensorId]);
        

       if (this.log.logging) this.log.log('info', sensorId + ' B#' + this.receivedBroadcastCounter[sensorId], page, page.toString());

        this.addPage(page);  

        this.previousPage[sensorId] = page;

    };

    return DeviceProfile_SPDCAD;
});
