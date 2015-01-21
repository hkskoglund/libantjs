/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

// Based on documentation from Dynastream Android SDK 4.0.0
// Warning: Not guarateed to be compatible with Android SDK 4.0.0
// ANT Message Protocol and Usage Spec p. 67
define(function (require, exports, module) {
    "use strict";
    
    function LowPrioritySearchTimeout(timeout) {
        if (typeof timeout === 'undefined') {
          console.warn("No high priority timeout specified, setting it to default ",LowPrioritySearchTimeout.prototype.DEFAULT);
            this.timeout = LowPrioritySearchTimeout.prototype.DEFAULT;
        }
        else
            this.timeout = timeout;
    }
    
    LowPrioritySearchTimeout.prototype.DISABLED = 0x00;
    
    LowPrioritySearchTimeout.prototype.FIFTEEN_SECONDS = 0x06;
    
    LowPrioritySearchTimeout.prototype.SEVEN_AND_A_HALF_SECONDS = 0x03;
    
    LowPrioritySearchTimeout.prototype.TEN_SECONDS = 0x04;
    
    LowPrioritySearchTimeout.prototype.TWELVE_AND_A_HALF_SECONDS = 0x05;
    
    LowPrioritySearchTimeout.prototype.TWENTY_FIVE_SECONDS = 0x0A;
    
    LowPrioritySearchTimeout.prototype.TWENTY_TWO_AND_A_HALF_SECONDS = 0x09;
    
    LowPrioritySearchTimeout.prototype.TWO_AND_A_HALF_SECONDS = 0x01;
    
    LowPrioritySearchTimeout.prototype.FIVE_SECONDS = LowPrioritySearchTimeout.prototype.TWO_AND_A_HALF_SECONDS*2;
    
    // Infinite search timeout 
    LowPrioritySearchTimeout.prototype.MAX = 0xFF;
    
    LowPrioritySearchTimeout.prototype.DEFAULT = 0x0A;
    
    LowPrioritySearchTimeout.prototype.convertToMilliseconds = function ()
    
    {
        return this.timeout*2500;
    };
    
    LowPrioritySearchTimeout.prototype.create = function (milliseconds)
    {
        var msec = milliseconds,
            max = LowPrioritySearchTimeout.prototype.MAX-1*2500;
        
        if (msec > max)
            msec = max;
        
        if (msec < 2500)
            this.timeout = 1;
        else
          this.timeout = Math.round(msec/2500);
    };
    
    LowPrioritySearchTimeout.prototype.getRawValue = function ()
    {
        return this.timeout;
    };
    
    LowPrioritySearchTimeout.prototype.toString = function ()
    {
       return this.getRawValue()+" "+this.convertToMilliseconds()+ ' ms.';
    }
    
    module.exports = LowPrioritySearchTimeout;
    
    return module.exports;
    
    });
