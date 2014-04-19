/* global define: true, DataView: true */

define(['profiles/hrm/HRMPage'],function (HRMPage) {

    'use strict';
    
    function HRMPage0(configuration,broadcast,previousPage) {
        
       HRMPage.call(this,configuration);

       //this.profile = broadcast.profile;
          
       if (broadcast.data)
           this.parse(broadcast,previousPage);
    }
    
    HRMPage0.prototype = Object.create(HRMPage.prototype);
    HRMPage0.prototype.constructor = HRMPage0; 
    
    HRMPage0.prototype.parse = function (broadcast,previousPage)
    {
        var  data = broadcast.data, dataView = new DataView(data.buffer);
        
        this.broadcast = broadcast;
        
        this.readCommonBytes(data,dataView);

        // Old legacy format doesnt have previous heart beat event time
        this.previousHeartBeatEventTime = undefined;
      
      this.setRRInterval(previousPage);
        
    };
    
    // Set RR interval based on previous heart event time and heart beat count
    HRMPage0.prototype.setRRInterval = function (previousPage) {
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
    
            this.previousHeartBeatEventTime = previousPage.heartBeatEventTime;
          
            this.RRInterval = (heartBeatEventTimeDiff / 1024) * 1000; // ms.
    
        }
    };
    
    HRMPage0.prototype.toString = function () {
        var msg = "P# " + this.number + " T " + this.changeToggle + " HR " + this.computedHeartRate + " C " + this.heartBeatCount + " Tn " + this.heartBeatEventTime;
       
        
        if (this.RRInterval)
            msg +=  " Tn-1 " + this.previousHeartBeatEventTime + " Tn - Tn-1 " + (this.heartBeatEventTime - this.previousHeartBeatEventTime)+" RR " + this.RRInterval.toFixed(1) + " ms";
        
        return msg;
    };

   
    
    return HRMPage0;

});
