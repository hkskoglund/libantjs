/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

// Based on documentation from Dynastream Android SDK 4.0.0
// Warning: Not guarateed to be compatible with Android SDK 4.0.0
// ANT Message Protocol and Usage Spec p. 67
define(function (require, exports, module) {
    "use strict";
    
    function HighPrioritySearchTimeout(timeout) {
        if (typeof timeout === 'undefined') {
           console.warn("No high priority timeout specified, setting it to default ",HighPrioritySearchTimeout.prototype.DEFAULT);
           this.timeout = HighPrioritySearchTimeout.prototype.DEFAULT;
        }
        else
            this.timeout = timeout;
    }
    
    HighPrioritySearchTimeout.prototype.DISABLED = 0x00;
    
    HighPrioritySearchTimeout.prototype.TWO_AND_A_HALF_SECONDS = 0x01;
    
    HighPrioritySearchTimeout.prototype.FIVE_SECONDS = HighPrioritySearchTimeout.prototype.TWO_AND_A_HALF_SECONDS*2;
    
    // Infinite search timeout 
    HighPrioritySearchTimeout.prototype.MAX = 0xFF;
    
    HighPrioritySearchTimeout.prototype.DEFAULT = 0x0A;
    
    HighPrioritySearchTimeout.prototype.convertToMilliseconds = function ()
    
    {
        return this.timeout*2500;
    };
    
    HighPrioritySearchTimeout.prototype.create = function (milliseconds)
    {
        var msec = milliseconds,
            max = HighPrioritySearchTimeout.prototype.MAX-1*2500;
        
        if (msec > max)
            msec = max;
        
        if (msec < 2500)
            this.timeout = 1;
        else
          this.timeout = Math.round(msec/2500);
    };
    
    HighPrioritySearchTimeout.prototype.getRawValue = function ()
    {
        return this.timeout;
    };
    
    HighPrioritySearchTimeout.prototype.toString = function ()
    {
       return this.getRawValue()+" "+this.convertToMilliseconds()+ ' ms.';
    };
    
    module.exports = HighPrioritySearchTimeout;
    
    return module.exports;
    
    });
