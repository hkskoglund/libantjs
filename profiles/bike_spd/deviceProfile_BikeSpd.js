/* globals define: true */

define(['profiles/bike_spdcad/deviceProfile_BikeShared','profiles/bike_spd/bikePage0'],function (DeviceProfileBikeShared,BikePage0) {

    'use strict';

    function DeviceProfile_BikeSpd(configuration) {

        DeviceProfileBikeShared.call(this, configuration);

        this.initMasterSlaveConfiguration();

        this.requestPageUpdate(DeviceProfile_BikeSpd.prototype.DEFAULT_PAGE_UPDATE_DELAY);
    }

    DeviceProfile_BikeSpd.prototype = Object.create(DeviceProfileBikeShared.prototype);
    DeviceProfile_BikeSpd.prototype.constructor = DeviceProfile_BikeSpd;


    DeviceProfile_BikeSpd.prototype.NAME = 'BIKE_SPD';

    DeviceProfile_BikeSpd.prototype.CHANNEL_ID = {
        DEVICE_TYPE: 0x7B, // 123
       // TRANSMISSION_TYPE: 1 // or 5
    };

    DeviceProfile_BikeSpd.prototype.CHANNEL_PERIOD = {
        DEFAULT: 8118, // 4.06Hz
    };

    DeviceProfile_BikeSpd.prototype.PAGE_TOGGLE_CAPABLE = true;


    DeviceProfile_BikeSpd.prototype.getPage = function (broadcast)
    {

        var pageNumber = this.getPageNumber(broadcast),
            page;

        if (pageNumber === 0) // MAIN
        {

            page = new BikePage0({ logger: this.log}, broadcast,this,pageNumber);

        } else
        {
             page = this.getBackgroundPage(broadcast,pageNumber);

            if (page) {
                BikePage0.prototype.readSpeed.call(page,BikePage0.prototype);
                BikePage0.prototype.calcSpeed.call(page,BikePage0.prototype);

            } else
              {
                  if (this.log && this.log.logging) {
                    this.log.log('error','Failed to get background page for page number '+pageNumber,this);
                  }
              }
        }

        return page;

    };

    return DeviceProfile_BikeSpd;

});
