/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';
    var GenericPage = require('profiles/Page');

    function Page(configuration, broadcast, previousPage) {
        GenericPage.call(this, configuration);

        this.type = GenericPage.prototype.TYPE.MAIN;
        this.previousPage = previousPage;
        this.timestamp = Date.now();

       
        if (broadcast.data)
            this.parse(broadcast);
    }

    Page.prototype = Object.create(GenericPage.prototype);
    Page.prototype.constructor = Page;

    // ANT+ Message byte layout
    Page.prototype.BYTE = {
        BIKE_CADENCE_EVENT_TIME: 0,
        CUMULATIVE_CADENCE_REVOLUTION_COUNT: 2,
        BIKE_SPEED_EVENT_TIME: 4,
        CUMULATIVE_SPEED_REVOLUTION_COUNT: 6
    };

    Page.prototype.parse = function (broadcast) {
        var data = broadcast.data,
            dataView = new DataView(data.buffer),
            cumulativeCadenceRevolutionCountRollover,
            cumulativeSpeedRevolutionCountRollover,
            bikeCadenceEventTimeRollover,
            bikeSpeedEventTimeRollover,
            bikeSpeedEventTimeDifference,
            bikeCadenceEventTimeDifference;

        this.broadcast = broadcast;

        this.number = 0;

        // Byte 0-1 - Bike Cadence Event Time LSB MSB - last valid bike cadence event - unit: 1/1024s - rollover : 64 s

        this.bikeCadenceEventTime = dataView.getUint16(data.byteOffset + Page.prototype.BYTE.BIKE_CADENCE_EVENT_TIME, true);

        // Byte 2-3 - Cumulative Cadence Revolution Cound LSB MSB - total number of pedal revolutions - rollover : 65536

        this.cumulativeCadenceRevolutionCount = dataView.getUint16(data.byteOffset + Page.prototype.BYTE.CUMULATIVE_CADENCE_REVOLUTION_COUNT, true);
        
        // Byte 4-5 - Bike speed event time LSB MSB - time of last valid bike speed event - unit : 1/1024 s, 64 s

        this.bikeSpeedEventTime = dataView.getUint16(data.byteOffset + Page.prototype.BYTE.BIKE_SPEED_EVENT_TIME, true);

        // Byte 6-7 - Cumulative Speed Revolution LSB MSB - total number of wheel revolutions - rollover : 65536

        this.cumulativeSpeedRevolutionCount = dataView.getUint16(data.byteOffset + Page.prototype.BYTE.CUMULATIVE_SPEED_REVOLUTION_COUNT, true);

        // Cadence
        // Spec. section 5.3.1 - Cadence computation, p. 29

        
        // Initialy we have no previous page, so have to check for previous page
        if (this.previousPage) {

            // Don't attempt to calculate cadence and speed if time between pages is greater than rollover time
            if (this.timestamp - this.previousPage.timestamp >= 64000) {
                if (this.log.logging) this.log.log('warn', 'Time between pages from is over rollover threshold, skipped cadence and speed calculation', this.page, this.previousPage);
                return;
            }

            cumulativeCadenceRevolutionCountRollover = (this.cumulativeCadenceRevolutionCount < this.previousPage.cumulativeCadenceRevolutionCount);
            bikeCadenceEventTimeRollover = (this.bikeCadenceEventTime < this.previousPage.bikeCadenceEventTime);
            bikeSpeedEventTimeRollover = (this.bikeSpeedEventTime < this.previousPage.bikeSpeedEventTime);


            if (bikeCadenceEventTimeRollover)
                bikeCadenceEventTimeDifference = 0xFFFF + (this.bikeCadenceEventTime - this.previousPage.bikeCadenceEventTime);
            else
                bikeCadenceEventTimeDifference = this.bikeCadenceEventTime - this.previousPage.bikeCadenceEventTime;

            // RPM - rounds pr minute
            if (cumulativeCadenceRevolutionCountRollover)
                this.cadence = 61440 * (0xFFFF - this.cumulativeCadenceRevolutionCount + this.previousPage.cumulativeCadenceRevolutionCount) / bikeCadenceEventTimeDifference;
            else if (this.cumulativeCadenceRevolutionCount !== this.previousPage.cumulativeCadenceRevolutionCount && bikeCadenceEventTimeDifference > 0) {

                this.cadence = 61440 * (this.cumulativeCadenceRevolutionCount - this.previousPage.cumulativeCadenceRevolutionCount) / bikeCadenceEventTimeDifference;
            }


        }

    };

   
    Page.prototype.toString = function () {
        var msg = this.type + " P# " + this.number + " cadence (rpm) "+this.cadence+ " cadence event time " + this.bikeCadenceEventTime + ' rev. # ' + this.cumulativeCadenceRevolutionCount +
            ' speed event time ' + this.bikeSpeedEventTime + ' rev. # ' + this.cumulativeSpeedRevolutionCount;

        return msg;
    };

    module.exports = Page;

    return module.exports;

});