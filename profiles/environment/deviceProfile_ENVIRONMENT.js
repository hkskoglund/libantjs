﻿/* global define: true, DataView: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

// MAYBE, BUT LOW PRIORITY : Support enabling ANT-FS if device is capable of it.

define(function (require, exports, module) {
'use strict'; 

    var DeviceProfile = require('profiles/deviceProfile'),
        setting = require('settings'),
        HighPrioritySearchTimeout = require('messages/HighprioritySearchTimeout'),
        LowPrioritySearchTimeout = require('messages/LowprioritySearchTimeout'),
        TempPage0 = require('profiles/environment/TemperaturePage0'),
        TempPage1 = require('profiles/environment/TemperaturePage1'),
        GenericPage = require('profiles/Page');
      
    function DeviceProfile_ENVIRONMENT(configuration) {
      
        DeviceProfile.call(this, configuration);
        
        this.addConfiguration("slave", {
            description: "Slave configuration for ANT+ ENVIRONMENT device profile",
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_ENVIRONMENT.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: '*' },
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

        this.delayedPages = {};

        this.requestPageUpdate(DeviceProfile_ENVIRONMENT.prototype.DEFAULT_PAGE_UPDATE_DELAY); 

    }
    
    DeviceProfile_ENVIRONMENT.prototype = Object.create(DeviceProfile.prototype); 
    DeviceProfile_ENVIRONMENT.prototype.constructor = DeviceProfile_ENVIRONMENT; 
    
    DeviceProfile_ENVIRONMENT.prototype.DEFAULT_PAGE_UPDATE_DELAY = 5000;

    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_ID = {
        DEVICE_TYPE : 25, // 0x19
        TRANSMISSION_TYPE : 0x05 // Low nibble
    };
    
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_DEFAULT = 8192;
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_ALTERNATIVE = 65535;
    
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_ARRAY = [
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_DEFAULT, // 4Hz
    DeviceProfile_ENVIRONMENT.prototype.CHANNEL_PERIOD_ALTERNATIVE]; // 0.5 Hz low power

    DeviceProfile_ENVIRONMENT.prototype.hasCommonPages = true;
    
//    DeviceProfile_ENVIRONMENT.prototype.channelResponse = function (channelResponse) {
//            this.log.log('log', 'DeviceProfile ENVIRONMENT', channelResponse, channelResponse.toString());
    //    };

   
//    
    DeviceProfile_ENVIRONMENT.prototype.broadCast = function (broadcast) {
//    var  data = broadcast.data,
        //         dataView = new DataView(data.buffer);

        var page,
            pageNumber = broadcast.data[0],
            sensorId = broadcast.channelId.sensorId,
            pageIdentifier = sensorId + '.' + pageNumber;
           
        // Don't process broadcast with wrong device type
        if (!this.verifyDeviceType(DeviceProfile_ENVIRONMENT.prototype.CHANNEL_ID.DEVICE_TYPE,broadcast))
            return;

        this.countBroadcast(sensorId);
      
        // Don't process duplicate broadcast
        if (this.isDuplicateMessage(broadcast)) 

            return;
  
        switch (pageNumber) {
             
            // Device capabilities - why main page?
            case 0 : 
                
                 page = new TempPage0({log : this.log.logging },broadcast);
               // page = this.tempPage0;
               // page.parse(broadcast);
                
                break;
                
            // Temperature
            case 1: 
                
                 page = new TempPage1({ log : this.log.logging },broadcast);
                //page = this.tempPage1;
                //page.parse(broadcast);
                
                break;
                
            default :
                
                // Check for common page 80,...
               
                //page = this.genericPage;
                page = new GenericPage({ log: this.log.logging });

                if (page.parse(broadcast) === -1) // Not a common page
                {
                    // Issue : Receive page 2 for temp sensor (does not exist)
                    //  May indicate that a broadcast from another sensor is sent with the wrong channelId in extended data...
                    // Page 2 should be page 1 -> maybe a bit error?, CRC is OK
                    if (this.log.logging) this.log.log('error', 'Failed to parse page ' + page.number + ' broadcast', broadcast.toString());
                    page = undefined;
                }
              
                break;
                    
            }
        
        if (page) {

            this.addPage(page);
           
            if (this.log.logging) this.log.log('info', sensorId+' B#'+this.receivedBroadcastCounter[sensorId], page, page.toString());
           
        }
            
  
    };
       
    module.exports = DeviceProfile_ENVIRONMENT;
    
    return module.exports;
});