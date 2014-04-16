/* globals define: true, require: true */

define(['profiles/deviceProfile','profiles/bike_spd/bikePage0','profiles/cumulativeOperatingTime','profiles/manufacturerId','profiles/productId','profiles/Page'],function (DeviceProfile, BikePage0, CumulativeOperatingTime,ManufacturerId, ProductId,GenericPage) {

    'use strict';

    function DeviceProfile_BikeSpd(configuration) {

        DeviceProfile.call(this, configuration);

        this.initMasterSlaveConfiguration();

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
    };

    DeviceProfile_BikeSpd.prototype.WHEEL_CIRCUMFERENCE = 2.07; // in meter -> should be able to configure in a setting

    DeviceProfile_BikeSpd.prototype.PAGE_TOGGLE_CAPABLE = true;

    DeviceProfile_BikeSpd.prototype.ROLLOVER_THRESHOLD = 64000; // Max time between pages/broadcasts for valid speed/cadence calculations which is based on state of the previous page

    DeviceProfile_BikeSpd.prototype.getPageNumber = function (broadcast)
    {
     var deviceType = broadcast.channelId.deviceType,
            data = broadcast.data,
            pageNumber;

         // Byte 0 - Page number

       if (this.isPageToggle(broadcast))

        pageNumber = data[0] & GenericPage.prototype.BIT_MASK.PAGE_NUMBER; // (7 lsb)

       else

         pageNumber = 0;  // Legacy

        return pageNumber;
    };

    // Deserialize to page objects based on page number
    DeviceProfile_BikeSpd.prototype.getPage = function (broadcast)
    {
        var pageNumber = this.getPageNumber(broadcast),
            page;

        if (pageNumber === 0) // MAIN
                page = new BikePage0({ logger: this.log}, broadcast,this,pageNumber);
        else // BACKGROUND 1-3
        {
            page = this.getCommonPage(broadcast,pageNumber);
            this.mixin(Object.getPrototypeOf(page),BikePage0.prototype);
            page.readCommonBytes(broadcast);
            page.update(broadcast);
        }

        return page;

    };

    return DeviceProfile_BikeSpd;

});
