/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';
    var GenericPage = require('profiles/Page');
    
    function HRMPage1(configuration,broadcast,previousPage) {
       GenericPage.call(this,configuration);
    
       this.type = HRMPage1.prototype.TYPE.BACKGROUND;

       //this.profile = broadcast.profile;
          
       if (broadcast.data)
           this.parse(broadcast,previousPage);
    }
    
    HRMPage1.prototype = Object.create(GenericPage.prototype); 
    HRMPage1.prototype.constructor = HRMPage1; 
    
    HRMPage1.prototype.parse = function (broadcast)
    {
        var data = broadcast.data,
            dataView = new DataView(data.buffer);
        
        this.broadcast = broadcast;
        
        this.number = data[0] & 0x7F;
        
        this.changeToggle = (data[0] & 0x80) >> 7;
        
        // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        this.heartBeatEventTime = dataView.getUint16(data.byteOffset+4,true);
    
        // Counter for each heart beat event, rollover 255 counts
        this.heartBeatCount = data[6];
    
        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        this.computedHeartRate = data[7];
       
        // Cumulative operating time : 
        // Byte 1 = bit 0-7, Byte 2 = bit 8-15, Byte 3 = bit 16 - 23 (little endian)

        this.cumulativeOperatingTime = (dataView.getUint32(data.byteOffset+1,true) & 0x00FFFFFF) * 2; // Seconds since reset/battery replacement

        // Must look up to generic page through prototype chain (only 1 level should not affect performance considerably)
        this.cumulativeOperatingTimeString = this.toStringCumulativeOperatingTime(this.cumulativeOperatingTime);

        this.lastBatteryReset = (new Date(Date.now() - this.cumulativeOperatingTime * 1000)).toLocaleString();


    };
    
    // Override default .toString on Object.prototype
    HRMPage1.prototype.toString = function () {
          var msg = this.type + " P# " + this.number +" Cumulative operating time  " + this.cumulativeOperatingTimeString;
        
        return msg;
    };
    
    module.exports = HRMPage1;
        
    return module.exports;
    
});
