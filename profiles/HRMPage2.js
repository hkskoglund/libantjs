/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';
    var GenericPage = require('profiles/Page');
    
    function Page(configuration,broadcast) {
       GenericPage.call(this,configuration);
    
         this.type = Page.prototype.TYPE.BACKGROUND;
          
       if (broadcast.data)
           this.parse(broadcast);
    }
    
    Page.prototype = Object.create(GenericPage.prototype); 
    Page.prototype.constructor = Page; 
    
    Page.prototype.parse = function (broadcast)
    {
        var channelId = broadcast.channelId;
        
          var  data = broadcast.data, dataView = new DataView(data.buffer);
        this.number = data[0] & 0x7F;
        
        this.pageToggle = (data[0] & 0x80) >> 7;
        
        // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        this.heartBeatEventTime = dataView.getUint16(data.byteOffset+4,true);
    
        // Counter for each heart beat event, rollover 255 counts
        this.heartBeatCount = data[6];
    
        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        this.computedHeartRate = data[7];
        
        this.manufacturerID = data[1];
        this.serialNumber = dataView.getUint16(data.byteOffset+2,true); // Upper 16-bits of a 32 bit serial number
    
        // Set the lower 2-bytes of serial number, if available in channel Id.
        if (typeof channelId !== "undefined" && typeof channelId.deviceNumber !== "undefined")
            this.serialNumber = (this.serialNumber << 16) | channelId.deviceNumber;
    
      
    };
    
    Page.prototype.toString = function () {
        var  msg = this.type + " P# " + this.number +" Manufacturer " + this.manufacturerID + " serial num. : " + this.serialNumber;
        
        return msg;
    };
    
    module.exports = Page;
        
    return module.exports;
    
});