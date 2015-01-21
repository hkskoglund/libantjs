/* global define: true, DataView: true */

define(['profiles/mainPage'], function _requireDefineHRMPage(MainPage) {

    'use strict';

    function HRMPage(configuration, broadcast, profile,pageNumber) {

        MainPage.call(this,configuration, broadcast, profile,pageNumber);
    }

    HRMPage.prototype = Object.create(MainPage.prototype);
    HRMPage.prototype.constructor = HRMPage;

    // Deviceprofile p. 17 "Bytes 4-7 have the same definition for every data page"
    HRMPage.prototype.readHR = function ()
    {
         var data = this.broadcast.data,
             dataView = new DataView(data.buffer);

          // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        this.heartBeatEventTime = dataView.getUint16(data.byteOffset+4,true);

        // Counter for each heart beat event, rollover 255 counts
        this.heartBeatCount = data[6];

        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        this.computedHeartRate = data[7];

    };

    // Set RR interval based on previous heart event time and heart beat count
    HRMPage.prototype.calcRRInterval = function () {


        var previousPage = this.profile.getPreviousPageValidateRolloverTime(),
            heartBeatCountDelta,
            heartBeatEventTimeDelta,
            previousHeartBeatEventTime;

         if (!previousPage) {
          return;
         }

            heartBeatCountDelta = this.heartBeatCount - previousPage.heartBeatCount;

        if (heartBeatCountDelta < 0) {  // Toggle 255 -> 0 should give 1 beat difference
            heartBeatCountDelta += 256;
        }

         // Only calculate RR for one beat difference
        if (heartBeatCountDelta === 1) {

            if (!this.previousHeartBeatEventTime) {// Page 0 doesnt have previousHeartBeatEventTime
              previousHeartBeatEventTime = previousPage.heartBeatEventTime;
            } else {
              previousHeartBeatEventTime = this.previousHeartBeatEventTime;
            }
            heartBeatEventTimeDelta = this.heartBeatEventTime - previousHeartBeatEventTime;

            if (heartBeatEventTimeDelta < 0) { // Roll over 65535 -> 0, should give 1 heart beat eventtime diff.
                heartBeatEventTimeDelta += 65536;
            }

            this.RRInterval = (heartBeatEventTimeDelta / 1024) * 1000; // ms.

        }
    };

    HRMPage.prototype.update = function ()
    {
        this.calcRRInterval();
    };

     HRMPage.prototype.toString = function () {

        var msg =  "HR " + this.computedHeartRate + " C " + this.heartBeatCount + " Tn " + this.heartBeatEventTime + " Tn-1 " + this.previousHeartBeatEventTime + " T - Tn-1 " + (this.heartBeatEventTime - this.previousHeartBeatEventTime);

        if (this.RRInterval) {
                msg += " RR " + this.RRInterval.toFixed(1) + " ms";
        }
        return msg;
    };

    return HRMPage;

});
