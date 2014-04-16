/* globals define: true, require: true */

define(['profiles/deviceProfile','profiles/spdcad/SPDCADPage0','profiles/Page'],function (DeviceProfile, SPDCADPage0,GenericPage) {

    'use strict';

    function DeviceProfile_SPDCAD(configuration) {

        DeviceProfile.call(this, configuration);

        this.initMasterSlaveConfiguration();

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


    DeviceProfile_SPDCAD.prototype.getPageNumber = function (broadcast)
    {

        return 0; // SPDCAD has only page 0
    };

    DeviceProfile_SPDCAD.prototype.getPage = function (broadcast) {

         var pageNumber = this.getPageNumber(broadcast),
            page;

        switch (pageNumber)
        {
                case 0:

                    page = new SPDCADPage0({ logger: this.log }, broadcast,this,pageNumber);

                    break;


                default:

                   if (this.log && this.log.logging)
                    this.log.log('error','Cannot handle page number '+pageNumber+' of broadcast',broadcast);

                   break;

        }

        return page;

    };

    return DeviceProfile_SPDCAD;

});
