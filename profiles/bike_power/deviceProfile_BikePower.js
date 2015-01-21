/* global define: true */

define(['profiles/deviceProfile','profiles/bike_power/powerOnlyMainPage0x10'],function (DeviceProfile,PowerOnlyMainPage0x10) {

 'use strict';

    function DeviceProfile_BikePower(configuration) {

        DeviceProfile.call(this, configuration);

        this.initMasterSlaveConfiguration();
    }

    DeviceProfile_BikePower.prototype = Object.create(DeviceProfile.prototype);
    DeviceProfile_BikePower.prototype.constructor = DeviceProfile_BikePower;

    DeviceProfile_BikePower.prototype.DEFAULT_PAGE_UPDATE_DELAY = 1000;

    // Transmission from power sensor each 8182/32768 seconds -> approx 4.00 Hz, ANT+ Managed Network Document – Bicycle Power Device Profile, 4.1 - p. 19 CHANNEL configuration
    DeviceProfile_BikePower.prototype.CHANNEL_PERIOD = {
        DEFAULT : 8182,

    };

    DeviceProfile_BikePower.prototype.NAME = 'BIKE_POWER';

    DeviceProfile_BikePower.prototype.CHANNEL_ID = {
        DEVICE_TYPE: 0x0B,
       // TRANSMISSION_TYPE : 0x01
    };

    DeviceProfile_BikePower.prototype.PAGE_TOGGLE_CAPABLE = false;

    DeviceProfile_BikePower.prototype.getPageNumber = function (broadcast)
    {
     var
            data = broadcast.data,
            pageNumber;

        pageNumber = data[0];

        return pageNumber;

    };

    DeviceProfile_BikePower.prototype.getPage = function (broadcast)
    {
         var page,
             pageNumber = this.getPageNumber(broadcast);

          switch (pageNumber) {


            case 0x10 :

                  page = new PowerOnlyMainPage0x10({ logger: this.log}, broadcast,this,pageNumber);

                  break;

            // BACKGROUND

            default:

                     page= this.getBackgroundPage(broadcast,pageNumber);

                     if (page)
                     {
                       //HRMPage.prototype.readHR.call(page);
                       //HRMPage.prototype.calcRRInterval.call(page);
                     }

                 break;

          }

        return page;

    };

    return DeviceProfile_BikePower;
});
