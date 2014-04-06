/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';
    var GenericPage = require('profiles/Page');
    
    function HRMPage3(configuration,broadcast) {
       GenericPage.call(this,configuration);
    
       this.type = HRMPage3.prototype.TYPE.BACKGROUND;

       //this.profile = broadcast.profile;
          
       if (broadcast.data)
           this.parse(broadcast);
    }
    
    HRMPage3.prototype = Object.create(GenericPage.prototype); 
    HRMPage3.prototype.constructor = HRMPage3; 
    
    HRMPage3.prototype.parse = function (broadcast)
    {
          var  data = broadcast.data, dataView = new DataView(data.buffer);
        
        this.broadcast = broadcast;
        
        this.number = data[0] & 0x7F;
        
        this.changeToggle = (data[0] & 0x80) >> 7;
        
        // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        this.heartBeatEventTime = dataView.getUint16(data.byteOffset+4,true);
    
        // Counter for each heart beat event, rollover 255 counts
        this.heartBeatCount = data[6];
    
        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        this.computedHeartRate = data[7];
      
        this.hardwareVersion = data[1];
        this.softwareVersion = data[2];
        this.modelNumber = data[3];

    };
    
    HRMPage3.prototype.toString = function () {
       var msg = this.type + " P# " + this.number +" HW ver. " + this.hardwareVersion + " SW ver. " + this.softwareVersion + " Model " + this.modelNumber;
        
        return msg;
    };
    
    module.exports = HRMPage3;
        
    return module.exports;
    
});
