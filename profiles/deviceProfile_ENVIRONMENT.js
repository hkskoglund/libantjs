/* global define: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

// MAYBE : Support enabling ANT-FS if device is capable of it.

define(function (require, exports, module) {
'use strict'; 

    var DeviceProfile = require('profiles/deviceProfile'),
        setting = require('settings'),
        HighPrioritySearchTimeout = require('messages/HighprioritySearchTimeout'),
        LowPrioritySearchTimeout = require('messages/LowprioritySearchTimeout');
    
   
    
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
    
    module.exports = DeviceProfile_ENVIRONMENT;
    return module.exports;
});