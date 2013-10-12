/* global define: true */

define(function (require, exports, module) {
'use strict'; 

//
    var DeviceProfile = require('profiles/deviceProfile'),
         setting = require('settings');
//    var DeviceProfile_HRM = require('./deviceProfile_HRM.js');
//    var DeviceProfile_SDM = require('./deviceProfile_SDM.js');
//    var DeviceProfile_SPDCAD = require('./deviceProfile_SPDCAD.js');
//    var Channel = require('../channel.js');
   
    function RxScanMode(configuration, deviceNumber, deviceType, transmissionType) {
        var devNum = deviceNumber || '*',
            devType = deviceType || '*',
            transType = transmissionType || '*';
        
        DeviceProfile.call(this,configuration);
         
         this.addConfiguration("slave", {
            description: "Slave configuration Rx Scan Mode for any ANT+ devices",
            networkKey: setting.networkKey["ANT+"],
            channelType: "slave only",
            channelId: { deviceNumber: devNum, deviceType: devType, transmissionType: transType },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            RxScanMode : true
                 
    
        });
        
    }
    
    RxScanMode.prototype = DeviceProfile.prototype;
    RxScanMode.constructor = RxScanMode;
   
    RxScanMode.prototype.broadCast = function (broadcast) {
            this.log.log('log',broadcast.channelId.toString());
//            //channelID:
//            //    { channelNumber: 0,
//            //        deviceNumber: 51144,
//            //        deviceTypeID: 124,
//            //        transmissionType: 1,
//            // TO DO : open channel for  this.channelID device profile
//    
//            var deviceProfile,
//                self = this; // Emitting channel
//    
//            // console.log(Date.now(), "Continous scanning channel BROADCAST : ", data, this.channelID.toString());
//    
//            // Create new object for a new master
//            if (typeof this.channelIDCache[this.channelID.toProperty] === "undefined") {
//                this.channelIDCache[this.channelID.toProperty] = {};
//                console.log(Date.now(), "New master", this.channelID.toString());
//            }
//    
//            switch (this.channelID.deviceTypeID) {
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
//            }
    
        };
    
    
    module.exports = RxScanMode;
        return module.exports;
});
