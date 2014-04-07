/* global define: true, DataView: true */

define(['profiles/hrm/HRMPage'],function (HRMPage) {

    'use strict';
    
    function HRMPage3(configuration,broadcast) {

       HRMPage.call(this,configuration);
    
       this.type = this.TYPE.BACKGROUND;

       //this.profile = broadcast.profile;
          
       if (broadcast.data)
           this.parse(broadcast);
    }
    
    HRMPage3.prototype = Object.create(HRMPage.prototype);
    HRMPage3.prototype.constructor = HRMPage3; 
    
    HRMPage3.prototype.parse = function (broadcast)
    {
          var  data = broadcast.data, dataView = new DataView(data.buffer);
        
        this.broadcast = broadcast;
        
        this.readCommonBytes(data,dataView);
        
        this.readProductId(data);


    };
    
    HRMPage3.prototype.toString = function () {
       var msg = this.type + " P# " + this.number +" HW ver. " + this.hardwareVersion + " SW ver. " + this.softwareVersion + " Model " + this.modelNumber;
        
        return msg;
    };
    
    return HRMPage3;

    
});
