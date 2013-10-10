/* global define: true, DataView: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

// MAYBE, BUT LOW PRIORITY : Support enabling ANT-FS if device is capable of it.

define(function (require, exports, module) {
'use strict'; 

    var DeviceProfile = require('profiles/deviceProfile'),
        setting = require('settings'),
        HighPrioritySearchTimeout = require('messages/HighprioritySearchTimeout'),
        LowPrioritySearchTimeout = require('messages/LowprioritySearchTimeout'),
        TempPage0 = require('profiles/TemperaturePage0'),
        TempPage1 = require('profiles/TemperaturePage1'),
        GenericPage = require('profiles/Page');
    
   
    
    function DeviceProfile_ENVIRONMENT(configuration) {
      
        DeviceProfile.call(this, configuration);
        
        this.addConfiguration("slave", {
            description: "Slave configuration for ANT+ ENVIRONMENT device profile",
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_ENVIRONMENT.prototype.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            LPsearchTimeout: new LowPrioritySearchTimeout(LowPrioritySearchTimeout.prototype.MAX), 
            HPsearchTimeout: new HighPrioritySearchTimeout(HighPrioritySearchTimeout.prototype.DISABLED),
          
            channelPeriod:  DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_ARRAY          
    
        });
        
        this.addConfiguration("master", {
              description: "Master configuration for ANT+ ENVIRONMENT device profile",
            networkKey: setting.networkKey["ANT+"],
          
            channelType: "master",
            channelId: { deviceNumber: 'serial number', deviceType: DeviceProfile_ENVIRONMENT.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: DeviceProfile_ENVIRONMENT.prototype.CHANNEL_ID.TRANSMISSION_TYPE }, 
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
           
            channelPeriod: DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_ARRAY         
    
        });
        
        
    }
    
    // Inherit
    DeviceProfile_ENVIRONMENT.prototype = Object.create(DeviceProfile.prototype); 
    DeviceProfile_ENVIRONMENT.prototype.constructor = DeviceProfile_ENVIRONMENT; 
    
    
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_ID = {
        DEVICE_TYPE : 25, // 0x19
        TRANSMISSION_TYPE : 0x05 // Low nibble
    };
    
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_DEFAULT = 8192;
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_ALTERNATIVE = 65535;
    
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_ARRAY = [
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_DEFAULT, // 4Hz
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_ALTERNATIVE]; // 0.5 Hz low power
    
//    DeviceProfile_ENVIRONMENT.prototype.channelResponse = function (channelResponse) {
//            this.log.log('log', 'DeviceProfile ENVIRONMENT', channelResponse, channelResponse.toString());
//    };
//    
    DeviceProfile_ENVIRONMENT.prototype.broadCast = function (broadcast) {
    var  data = broadcast.data,
         dataView = new DataView(data.buffer);
                 
        if (!this.verifyDeviceType(DeviceProfile_ENVIRONMENT.prototype.DEVICE_TYPE,broadcast))
            return;
      
         if (this.isDuplicateMessage(broadcast.data))
            return ;
        
        var page, pageNumber = data[0];
            
        switch (pageNumber) {
             
            // Device capabilities
            case 0 : 
                
                page = new TempPage0({log : this.log.logging },data,dataView);
                
                break;
                
            // Temperature
            case 1: 
                
                page = new TempPage1({ log : this.log.logging },data,dataView);
                
                break;
                
            default :
                
                page = new GenericPage({ log : this.log.logging },data,dataView);
              
                break;
                    
            }
        
         if (page)
            this.log.log('log', this.receivedBroadcastCounter,page,page.toString());
        
        // Callback if higher level code wants page, i.e UI data-binding
        if (page)
            this.onPage(page);
 
        // Used for skipping duplicate messages
        this.previousBroadcastData = data;
        
        
    };
        
    
    module.exports = DeviceProfile_ENVIRONMENT;
    
    return module.exports;
});