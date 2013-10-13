/* global define: true */

define(function (require, exports, module) {
'use strict'; 

//
    var DeviceProfile = require('profiles/deviceProfile'),
         setting = require('settings'),
        TEMPProfile = require('profiles/deviceProfile_ENVIRONMENT');
//    var DeviceProfile_HRM = require('./deviceProfile_HRM.js');
//    var DeviceProfile_SDM = require('./deviceProfile_SDM.js');
//    var DeviceProfile_SPDCAD = require('./deviceProfile_SPDCAD.js');

   
    function RxScanMode(configuration) {
        var devNum =  '*',
            devType = '*',
            transType = '*';
        
        DeviceProfile.call(this,configuration);
        
        if (configuration.channelId) {
           devNum = configuration.channelId.deviceNumber || '*';
           devType = configuration.channelId.deviceType || '*';
           transType = configuration.channelId.transmissionType || '*';
        } 
        
         this.addConfiguration("slave", {
            description: "Slave configuration Rx Scan Mode for ANT+ devices",
            networkKey: setting.networkKey["ANT+"],
            channelType: "slave",
            channelId: { deviceNumber: devNum, deviceType: devType, transmissionType: transType },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            RxScanMode : true
        });
        
        this.addConfiguration("slave only", {
            description: "Slave only configuration Rx Scan Mode for ANT+ devices",
            networkKey: setting.networkKey["ANT+"],
            channelType: "slave only",
            channelId: { deviceNumber: devNum, deviceType: devType, transmissionType: transType },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            RxScanMode : true
        });
        
        // Temperature profile to be used by all temperature sensors
        
        this.temperatureProfile = new TEMPProfile({ log : this.log.logging,
                                                    onPage : configuration.onPage});
        
        
    }
    
    RxScanMode.prototype = DeviceProfile.prototype;
    RxScanMode.constructor = RxScanMode;
   
    RxScanMode.prototype.broadCast = function (broadcast) {
        if (!broadcast)
        {
            this.log.log('error','Undefined broadcast received');
            return;
        }
        
        if (!broadcast.channelId)
        {
            this.log.log('error','No channel id available for broadcast',broadcast);
            return;
        }
        
           // this.log.log('log',broadcast.channelId.toString(), broadcast.channelId);
        
            switch (broadcast.channelId.deviceType) 
            {
                    
                case TEMPProfile.prototype.CHANNEL_ID.DEVICE_TYPE:
                    
                    this.temperatureProfile.broadCast(broadcast);
                    
                    break;
//    
//                case DeviceProfile_HRM.prototype.DEVICE_TYPE:
//                    this.deviceProfile.deviceProfile_HRM.channel = this;
//                    //console.log("CHANNEL HRM", this.deviceProfile.deviceProfile_HRM.channel);
//                    //this.deviceProfile.channel = this;
//                    this.deviceProfile.deviceProfile_HRM.broadCastDataParser.call(this, data);
//                    break;
//    
//                case DeviceProfile_SDM.prototype.DEVICE_TYPE:
//                   // console.log("THIS.deviceProfile", this.deviceProfile.deviceProfile_SDM);
//                    //this.deviceProfile = this.deviceProfile.deviceProfile_SDM;
//                    //this.deviceProfile.channel = this;
//                    this.deviceProfile.deviceProfile_SDM.channel = this;
//                  
//                    //console.log("CHANNEL SDM", this.deviceProfile.deviceProfile_SDM.channel);
//                    this.deviceProfile.deviceProfile_SDM.broadCastDataParser.call(this,data);
//                    break;
//    
//                case DeviceProfile_SPDCAD.prototype.DEVICE_TYPE:
//                    this.deviceProfile.deviceProfile_SPDCAD.channel = this;
//    
//                    this.deviceProfile.deviceProfile_SPDCAD.broadCastDataParser.call(this, data);
//                    break;
//    
//                default:
//                    console.log(Date.now(), "Continous scanning channel BROADCAST : ", data, this.channelID);
//                    break;
            }
    
        };
    
    
    module.exports = RxScanMode;
        return module.exports;
});
