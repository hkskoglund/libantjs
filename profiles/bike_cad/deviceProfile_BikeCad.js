/* globals define: true, require: true */

define(['profiles/deviceProfile','settings','messages/HighPrioritySearchTimeout','messages/LowPrioritySearchTimeout','profiles/bike_cadd/bikeCadPage0','profiles/bike_cad/bikeCadPage1','profiles/bike_cadd/bikeCadPage2','profiles/bike_cad/bikeCadPage3','profiles/Page'],function (DeviceProfile, setting, LowPrioritySearchTimeout, HighPrioritySearchTimeout,BikeCadPage0,BikeCadPage1,BikeCadPage2,BikeCadPage3,GenericPage) {

    'use strict';

    function DeviceProfile_BikeCad(configuration) {

        DeviceProfile.call(this, configuration);


        // Used for calculation of cadence and speed
        // Using an object literal allows for tracking multiple sensors by indexing with sensorId (based on channelId)
        this.previousPage = {};

        this.requestPageUpdate(DeviceProfile_BikeCad.prototype.DEFAULT_PAGE_UPDATE_DELAY);
    }

    DeviceProfile_BikeCad.prototype = Object.create(DeviceProfile.prototype);
    DeviceProfile_BikeCad.prototype.constructor = DeviceProfile_BikeCad;

    DeviceProfile_BikeCad.prototype.DEFAULT_PAGE_UPDATE_DELAY = 1000;

    DeviceProfile_BikeCad.prototype.NAME = 'BIKE_SPD';

    DeviceProfile_BikeCad.prototype.CHANNEL_ID = {
        DEVICE_TYPE: 0x7A, // 122
        TRANSMISSION_TYPE: 1
    };

    DeviceProfile_BikeCad.prototype.CHANNEL_PERIOD = {
        DEFAULT: 8102, // ca 4 msg/sec.
        ALTERNATIVE_1: 16204, // 2.02 Hz
        ALTERNATIVE_2: 32408 // 1.01Hz
    };

    DeviceProfile_BikeCad.prototype.WHEEL_CIRCUMFERENCE = 2.07; // in meter -> should be able to configure in a setting

    DeviceProfile_BikeCad.prototype.PAGE_TOGGLE = true;

    DeviceProfile_BikeCad.prototype.broadCast = function (broadcast) {

        var page,
            data = broadcast.data,
            pageNumber = data[0] & GenericPage.prototype.BIT_MASK.PAGE_NUMBER,

            sensorId = broadcast.channelId.sensorId;

       // broadcast.profile = this;

        // Don't process broadcast with wrong device type
        if (!this.verifyDeviceType(DeviceProfile_BikeCad.prototype.CHANNEL_ID.DEVICE_TYPE, broadcast))
            return;

        this.countBroadcast(sensorId);

        // Don't process duplicate broadcast
        if (this.isDuplicateMessage(broadcast)) {

            return;

        }

        switch (pageNumber)
        {
            // MAIN

                case 0 :

                      page = new BikeCadPage0({ log: this.log.logging }, broadcast, this.previousPage[sensorId]);

                      break;

            // BACKGROUND

                // Cumulative operating time
                case 1:

                      page = new BikeCadPage1({log : this.log.logging }, broadcast,this.previousPage[sensorId]);
                      break;

                 // Manufacturer Id
                 case 2:

                      page = new BikeCadPage2({log : this.log.logging }, broadcast,this.previousPage[sensorId]);
                      break;

                 // Product Id
                 case 3:

                      page = new BikeCadPage3({log : this.log.logging }, broadcast,this.previousPage[sensorId]);
                      break;


                default :

                    if (this.log && this.log.logging)
                       this.log.log('warn','Cannot handle page '+this.number+' for device profile',this);

                    break;

        }

       if (page) {

           if (this.log.logging) this.log.log('info', sensorId + ' B#' + this.receivedBroadcastCounter[sensorId], page, page.toString());

            this.addPage(page);

            this.previousPage[sensorId] = page;
       }

    };

    return DeviceProfile_BikeCad;
});
