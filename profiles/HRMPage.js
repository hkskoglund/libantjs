/* global define: true, DataView: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
    var Page = require('profiles/Page');
    
    function HRMPage(broadcast) {
        Page.call(this);
        
        this.timestamp = Date.now();
    
        if (broadcast && broadcast.data) {
            this.channelId = broadcast.channelId;
            this.parseCommonHRFields(broadcast.data);
        }
    }
    
    HRMPage.prototype = Object.create(Page.prototype); 
    HRMPage.prototype.constructor = HRMPage; 
    
    HRMPage.prototype.toString = function () {
        var msg = this.type + " P# " + this.number + " T " + this.changeToggle + " HR " + this.computedHeartRate + " C " + this.heartBeatCount + " Tn " + this.heartBeatEventTime;
    
        var addRRInterval = function(msg) {
            if (this.RRInterval)
                return " RR " + this.RRInterval.toFixed(1) + " ms";
            else
                return "";
        }.bind(this);
    
        switch (this.number) {
            case 4:
                msg += " Tn-1 " + this.previousHeartBeatEventTime + " T-Tn-1 " + (this.heartBeatEventTime - this.previousHeartBeatEventTime);
                msg += addRRInterval.bind(this)();
                break;
    
            case 3:
                msg += " HW ver. " + this.hardwareVersion + " SW ver. " + this.softwareVersion + " Model " + this.modelNumber;
                break;
    
            case 2:
                msg += " Manufacturer " + this.manufacturerID + " serial num. : " + this.serialNumber;
                break;
    
            case 1:
                msg += " Cumulative operating time  " + this.cumulativeOperatingTime + " s = " + (this.cumulativeOperatingTime / 3600).toFixed(1) + " h";
                break;
    
            case 0:
                msg += addRRInterval();
                break;
    
            default:
                msg += "Unknown page number " + this.number;
                break;
    
    
        }
    
        return msg + " " + this.channelId.toString();
    };
    
    // Parses common fields for all pages
    HRMPage.prototype.parseCommonHRFields = function (data) {
        var dataView = new DataView(data.buffer); // Remeber to use .byteOffset to address the right byte in the buffer
        
        // Next 3 bytes are the same for every data page. (ANT+ HRM spec. p. 14, section 5.3)
    
        //this.changeToggle = (data[0] & 0x80) >> 7;
    
        // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        this.heartBeatEventTime = dataView.getUint16(data.byteOffset+4,true);
    
        // Counter for each heart beat event, rollover 255 counts
        this.heartBeatCount = data[6];
    
        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        this.computedHeartRate = data[7];
    };
    
    // Parses ANT+ pages the device uses paging
    HRMPage.prototype.parse = function (broadcast, previousHRMPage) {
       
        
        var data = broadcast.data, 
            dataView = new DataView(data.buffer);
        
        
            this.number = data[0] & 0x7F;  // Mask page toggle bit, if used
       
    
        switch (this.number) {
    
            case 4:
                // Main data page
    
                this.type = Page.prototype.TYPE.MAIN;
    
                this.previousHeartBeatEventTime = dataView.getUint16(data.byteOffset+2,true);
    
                // Only calculate RR if there is less than 64 seconds between data pages and 1 beat difference between last reception of page
                if (previousHRMPage.timestamp && (this.timestamp - previousHRMPage.timestamp) < 64000)
                    this.setRRInterval(previousHRMPage.heartBeatCount, previousHRMPage.heartBeatEventTime);
    
                break;
    
            case 3: // Background data page
                this.type = Page.prototype.TYPE.BACKGROUND;
    
                this.hardwareVersion = data[1];
                this.softwareVersion = data[2];
                this.modelNumber = data[3];
    
                break;
    
            case 2: // Background data page - sent every 65'th message
                this.type = Page.prototype.TYPE.BACKGROUND;
    
                this.manufacturerID = data[1];
                this.serialNumber = dataView.getUint16(data.byteOffset+2,true); // Upper 16-bits of a 32 bit serial number
    
                // Set the lower 2-bytes of serial number, if available in channel Id.
                if (typeof broadcast.channelId !== "undefined" && typeof broadcast.channelId.deviceNumber !== "undefined")
                    this.serialNumber = (this.serialNumber << 16) | broadcast.channelId.deviceNumber;
    
                break;
    
            case 1: // Background data page
                this.type = Page.prototype.TYPE.BACKGROUND;
    
                this.cumulativeOperatingTime = (dataView.getUint32(data.byteOffset+1,true) & 0x00FFFFFF) * 2; // Seconds since reset/battery replacement
    
                break;
    
            case 0: // Old legacy 
                this.type = Page.prototype.TYPE.MAIN;
               
    
                if (typeof previousHRMPage.heartBeatCount !== "undefined")
                    this.setRRInterval(previousHRMPage.heartBeatCount, previousHRMPage.heartBeatEventTime);
    
                break;
    
            default:
                throw new Error("Page " + this.number + " not supported");
                //break;
        }
    };
    
    // Page as JSON
    HRMPage.prototype.getJSON = function () {
        return JSON.stringify(
                 {
                     type: 'page',
                     page: this
                 });
    };
    
    // Set RR interval based on previous heart event time and heart beat count
    HRMPage.prototype.setRRInterval = function (previousHeartBeatCount, previousHeartBeatEventTime) {
        var heartBeatCountDiff = this.heartBeatCount - previousHeartBeatCount,
            heartBeatEventTimeDiff;
    
        if (heartBeatCountDiff < 0)  // Toggle 255 -> 0
            heartBeatCountDiff += 256;
    
        if (heartBeatCountDiff === 1) {
            heartBeatEventTimeDiff = this.heartBeatEventTime - previousHeartBeatEventTime;
    
            if (heartBeatEventTimeDiff < 0) // Roll over
                heartBeatEventTimeDiff += 0xFFFF;
    
            if (typeof this.previousHeartBeatEventTime === "undefined")  // Old legacy format doesnt have previous heart beat event time
                this.previousHeartBeatEventTime = previousHeartBeatEventTime;
    
            this.RRInterval = (heartBeatEventTimeDiff / 1024) * 1000; // ms.
    
        }
    };
    
    module.exports = HRMPage;
    
    return module.exports;
});
