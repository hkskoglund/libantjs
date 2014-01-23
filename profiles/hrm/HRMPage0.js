/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';
    var GenericPage = require('profiles/Page');
    
    function Page(configuration,broadcast,previousPage) {
       GenericPage.call(this,configuration);
        
       this.type = GenericPage.prototype.TYPE.MAIN;

       this.profile = broadcast.profile;
          
       if (broadcast.data)
           this.parse(broadcast,previousPage);
    }
    
    Page.prototype = Object.create(GenericPage.prototype); 
    Page.prototype.constructor = Page; 
    
    Page.prototype.parse = function (broadcast,previousPage)
    {
        var  data = broadcast.data, dataView = new DataView(data.buffer);
        
        this.broadcast = broadcast;
        
        this.number = data[0] & 0x7F;
        
        this.pageToggle = (data[0] & 0x80) >> 7;
        
        // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        this.heartBeatEventTime = dataView.getUint16(data.byteOffset+4,true);
    
        // Counter for each heart beat event, rollover 255 counts
        this.heartBeatCount = data[6];
    
        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        this.computedHeartRate = data[7];
      
      this.setRRInterval(previousPage);
        
    };
    
    // Set RR interval based on previous heart event time and heart beat count
    Page.prototype.setRRInterval = function (previousPage) {
        // Skip, if previous page not available
        if (!previousPage)
            return;
        
        var heartBeatCountDiff = this.heartBeatCount - previousPage.heartBeatCount,
            heartBeatEventTimeDiff;
    
        if (heartBeatCountDiff < 0)  // Toggle 255 -> 0
            heartBeatCountDiff += 256;
    
        if (heartBeatCountDiff === 1) {
            heartBeatEventTimeDiff = this.heartBeatEventTime - previousPage.heartBeatEventTime;
    
            if (heartBeatEventTimeDiff < 0) // Roll over
                heartBeatEventTimeDiff += 65536;
    
            if (typeof this.previousHeartBeatEventTime === "undefined")  // Old legacy format doesnt have previous heart beat event time
                this.previousHeartBeatEventTime = previousPage.heartBeatEventTime;
    
            this.RRInterval = (heartBeatEventTimeDiff / 1024) * 1000; // ms.
    
        }
    };
    
    Page.prototype.toString = function () {
        var msg = this.type + " P# " + this.number + " T " + this.pageToggle + " HR " + this.computedHeartRate + " C " + this.heartBeatCount + " Tn " + this.heartBeatEventTime + " Tn-1 " + this.previousHeartBeatEventTime + " T-Tn-1 " + (this.heartBeatEventTime - this.previousHeartBeatEventTime);
        
        if (this.RRInterval)
                msg += " RR " + this.RRInterval.toFixed(1) + " ms";
        
        return msg;
    };
    
    module.exports = Page;
        
    return module.exports;
    
});