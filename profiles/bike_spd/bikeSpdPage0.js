/* global define: true, DataView: true */

define(['profiles/bike_spd/bikeSpdPage'], function _requireDefineBikeSpdPage0(BikeSpdPage) {

    'use strict';

    function BikeSpdPage0(configuration, broadcast, previousPage) {

        BikeSpdPage.call(this, configuration);

        this.type = this.TYPE.MAIN;

        this.previousPage = previousPage;

        this.timestamp = Date.now();

        //this.profile = broadcast.profile;

        if (broadcast && broadcast.data)
            this.parse(broadcast);

    }

    BikeSpdPage0.prototype = Object.create(BikeSpdPage.prototype);
    BikeSpdPage0.prototype.constructor = BikeSpdPage0;

    BikeSpdPage0.prototype.parse = function (broadcast) {

        var data = broadcast.data,
            dataView = new DataView(data.buffer),
            cumulativeSpeedRevolutionCountRollover,
            bikeSpeedEventTimeRollover,
            bikeSpeedEventTimeDifference;

        this.broadcast = broadcast;

        // Byte 1-3 RESERVED 0xFF

        this.readCommonBytes(data,dataView);

        // Initialy we have no previous page, so have to check for previous page
        if (!this.previousPage)
          return;

        // Don't attempt to calculate cadence and speed if time between pages is greater than rollover time
        if (this.timestamp - this.previousPage.timestamp >= 64000) {
            if (this.log.logging) this.log.log('warn', 'Time between pages from is over rollover threshold, skipped cadence and speed calculation', this.page, this.previousPage);
            return;
        }

        cumulativeSpeedRevolutionCountRollover = (this.cumulativeSpeedRevolutionCount < this.previousPage.cumulativeSpeedRevolutionCount);

 bikeSpeedEventTimeRollover = (this.bikeSpeedEventTime < this.previousPage.bikeSpeedEventTime);

        if (bikeSpeedEventTimeRollover)
            bikeSpeedEventTimeDifference = 0xFFFF + (this.bikeSpeedEventTime - this.previousPage.bikeSpeedEventTime);
        else
            bikeSpeedEventTimeDifference = this.bikeSpeedEventTime - this.previousPage.bikeSpeedEventTime;

        // SPEED

        // The speed equation does not multiply with the wheel circumfence calibration factor (in meters)
        // Higher-lever code, e.g viewmodel should take this into account

        if (bikeSpeedEventTimeDifference) {
            if (cumulativeSpeedRevolutionCountRollover) {
                this.relativeCumulativeSpeedRevolutionCount = this.cumulativeSpeedRevolutionCount - this.previousPage.cumulativeSpeedRevolutionCount;
                this.unCalibratedSpeed = 1024 * (0xFFFF - this.relativeCumulativeSpeedRevolutionCount) / bikeSpeedEventTimeDifference;
            }
            else {
                this.relativeCumulativeSpeedRevolutionCount = this.cumulativeSpeedRevolutionCount - this.previousPage.cumulativeSpeedRevolutionCount;
                this.unCalibratedSpeed = 1024 * this.relativeCumulativeSpeedRevolutionCount / bikeSpeedEventTimeDifference;

            }
        }

        // Filter "spikes"
        // This issue has been noticed running the SimulANT+ application Version : AYD 1.5.0.0
        // Its only the first few packets that provokes this for unCalibratedSpeed

        if (this.unCalibratedSpeed > 512)
        {
            if (this.log && this.log.logging)
                this.log.log('warn', 'Very high uncalibrated speed filtered', this);
            this.unCalibratedSpeed = undefined;
        }

    };

    BikeSpdPage0.prototype.toString = function () {

        var calibrationFactor = 2.07, // Just used for a speed estimate
            speed,
            msg;

        msg = this.type + " P# " + this.number;

       if (this.unCalibratedSpeed !== undefined) {
           speed = calibrationFactor * this.unCalibratedSpeed;
           msg += ' speed (m/s) ' + speed;
       }

       msg += ' speedEventTime ' + this.bikeSpeedEventTime + ' wheelRevolution ' + this.cumulativeSpeedRevolutionCount +  ' default wheel size (m) ' + calibrationFactor;


        return msg;
    };

    return BikeSpdPage0;

});
