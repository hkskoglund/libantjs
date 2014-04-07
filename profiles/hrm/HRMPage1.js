/* global define: true, DataView: true */

define(['profiles/hrm/HRMPage'],function (HRMPage) {
    
    'use strict';

    function HRMPage1(configuration,broadcast,previousPage) {

       HRMPage.call(this,configuration);
    
       this.type = this.TYPE.BACKGROUND;

       //this.profile = broadcast.profile;
          
       if (broadcast.data)
           this.parse(broadcast,previousPage);
    }
    
    HRMPage1.prototype = Object.create(HRMPage.prototype);
    HRMPage1.prototype.constructor = HRMPage1; 
    
    HRMPage1.prototype.parse = function (broadcast)
    {
        var data = broadcast.data,
            dataView = new DataView(data.buffer);
        
        this.broadcast = broadcast;
        
        this.readCommonBytes(data,dataView);
       
        this.readCumulativeOperatingTime(data,dataView);


    };
    
    // Override default .toString on Object.prototype
    HRMPage1.prototype.toString = function () {
          var msg = this.type + " P# " + this.number +" Cumulative operating time  " + this.cumulativeOperatingTimeString;
        
        return msg;
    };
    
   return HRMPage1;

    
});
