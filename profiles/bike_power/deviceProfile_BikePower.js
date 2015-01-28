/* global define: true */

define(['profiles/deviceProfile','profiles/bike_power/powerOnlyMainPage0x10','profiles/backgroundPage','profiles/bike_power/calibrationMain'],function (DeviceProfile,PowerOnlyMainPage0x10, BackgroundPage, CalibrationMainPage) {

 'use strict';

    function DeviceProfile_BikePower(configuration) {

        DeviceProfile.call(this, configuration);

        this.initMasterSlaveConfiguration();

       this.requestPageUpdate(this.DEFAULT_PAGE_UPDATE_DELAY);
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
        TRANSMISSION_TYPE : 0x05
    };

    DeviceProfile_BikePower.prototype.getPageNumber = function (broadcast)
    {
     var    data = broadcast.data,
            pageNumber;

        pageNumber = data[0];

        return pageNumber;

    };

    // Parse received page
    DeviceProfile_BikePower.prototype.getPage = function (broadcast)
    {
         var page,
             pageNumber = this.getPageNumber(broadcast);

          switch (pageNumber) {


             case 0x01 :

                  page = new CalibrationMainPage({ logger: this.log}, broadcast,this,pageNumber);

                  break;

            case 0x10 :

                  page = new PowerOnlyMainPage0x10({ logger: this.log}, broadcast,this,pageNumber);

                  break;

            // BACKGROUND pages

            // required
            case BackgroundPage.prototype.COMMON.PAGE0x50 :
            case BackgroundPage.prototype.COMMON.PAGE0x51 :

            // optional
            case BackgroundPage.prototype.COMMON.PAGE0x52 :

                   page= this.getBackgroundPage(broadcast,pageNumber);

                     if (page)
                     {
                       //HRMPage.prototype.readHR.call(page);
                       //HRMPage.prototype.calcRRInterval.call(page);
                     }

                  break;

            default:

                  if (this.log && this.log.logging) {
                     this.log.log('error','Unable to handle page number',pageNumber,pageNumber.toString(16),broadcast,this);
                  }

                 break;

          }

        return page;

    };

    return DeviceProfile_BikePower;
});
