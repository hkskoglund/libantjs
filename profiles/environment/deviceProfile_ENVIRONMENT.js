/* global define: true */

define(['profiles/deviceProfile','profiles/environment/TemperaturePage0','profiles/environment/TemperaturePage1'],function (DeviceProfile,TempPage0,TempPage1) {

    'use strict';

    function DeviceProfile_ENVIRONMENT(configuration) {
      
        DeviceProfile.call(this, configuration);
        
        this.initMasterSlaveConfiguration();

        this.requestPageUpdate(DeviceProfile_ENVIRONMENT.prototype.DEFAULT_PAGE_UPDATE_DELAY); 

    }
    
    DeviceProfile_ENVIRONMENT.prototype = Object.create(DeviceProfile.prototype); 
    DeviceProfile_ENVIRONMENT.prototype.constructor = DeviceProfile_ENVIRONMENT; 
    
    DeviceProfile_ENVIRONMENT.prototype.DEFAULT_PAGE_UPDATE_DELAY = 5000;

    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_ID = {
        DEVICE_TYPE : 25, // 0x19
        TRANSMISSION_TYPE : 0x05 // Low nibble
    };
    
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD = {
        DEFAULT : 8192, // 4Hz
        ALTERNATIVE : 65535 // 0.5 Hz low power
    };


//    DeviceProfile_ENVIRONMENT.prototype.channelResponse = function (channelResponse) {
//            this.log.log('log', 'DeviceProfile ENVIRONMENT', channelResponse, channelResponse.toString());
    //    };


    DeviceProfile_ENVIRONMENT.prototype.getPageNumber = function (broadcast)
    {
        return broadcast.data[0];
    };

    DeviceProfile_ENVIRONMENT.prototype.getPage = function (broadcast)
    {
          var page,
            pageNumber = this.getPageNumber(broadcast);

        switch (pageNumber) {
             
            // Device capabilities - why main page?
            case 0 : 
                
                 page = new TempPage0({logger : this.log },broadcast,this,pageNumber);

                
                break;
                
            // Temperature
            case 1: 
                
                 page = new TempPage1({ logger : this.log },broadcast,this,pageNumber);

                
                break;
                
        }
        
        // Environment profile has global pages

        if (!page)
        {
            page = this.getBackgroundPage(broadcast,pageNumber);
        }

        return page;

    };

    return DeviceProfile_ENVIRONMENT;
    
});
