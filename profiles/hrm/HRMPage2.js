/* global define: true, DataView: true */

define(['profiles/hrm/HRMPage'],function (HRMPage) {

    'use strict';
    
    function HRMPage2(configuration,broadcast) {

       HRMPage.call(this,configuration);
    
       this.type = this.TYPE.BACKGROUND;

       //this.profile = broadcast.profile;
        
       if (broadcast.data)
           this.parse(broadcast);
        
    }
    
    HRMPage2.prototype = Object.create(HRMPage.prototype);
    HRMPage2.prototype.constructor = HRMPage2; 
    
    HRMPage2.prototype.parse = function (broadcast)
    {
        
          var  data = broadcast.data, dataView = new DataView(data.buffer);
        
        this.broadcast = broadcast;
        
        this.readCommonBytes(data,dataView);
        
        this.readManufacturerId(data,dataView,broadcast);

    };
    
    HRMPage2.prototype.toString = function () {
        var  msg = this.type + " P# " + this.number +" Manufacturer " + this.manufacturerID + " serial num. : " + this.serialNumber;
        
        return msg;
    };
    
    return HRMPage2;

});
