/* global define: true, DataView: true */

define(['profiles/mainPage'], function (MainPage) {

    'use strict';

    function SPDCADSharedPage(configuration, broadcast,profile,pageNumber) {

        MainPage.call(this, configuration, broadcast,profile,pageNumber);

    }

    SPDCADSharedPage.prototype = Object.create(MainPage.prototype);
    SPDCADSharedPage.prototype.constructor = SPDCADSharedPage;

    // SPDCAD page 0
    //   byteoffset  : 0
    // BIKECAD page 0
    //   byteoffset : 4 (Spec. Table 11: Page 0 Bike Cadence Data Format, p.27)
    SPDCADSharedPage.prototype.readCadence = function(proto)
    {

        var data = this.broadcast.data,
            dataView = new DataView(this.broadcast.data.buffer),
            prototype = proto || this;

         // Byte 0-1 - Bike Cadence Event Time LSB MSB - last valid bike cadence event - unit: 1/1024s - rollover : 64 s

        this.bikeCadenceEventTime = dataView.getUint16(data.byteOffset + prototype.BYTE.BIKE_CADENCE_EVENT_TIME, true);

        // Byte 2-3 - Cumulative Cadence Revolution Count LSB MSB - total number of pedal revolutions - rollover : 65536

        this.cumulativeCadenceRevolutionCount = dataView.getUint16(data.byteOffset + prototype.BYTE.CUMULATIVE_CADENCE_REVOLUTION_COUNT, true);
    };

    SPDCADSharedPage.prototype.readSpeed = function(proto)
    {

        var data = this.broadcast.data,
            dataView = new DataView(this.broadcast.data.buffer),
            prototype = proto || this;

            // Byte 4-5 - Bike speed event time LSB MSB - time of last valid bike speed event - unit : 1/1024 s, 64 s

            this.bikeSpeedEventTime = dataView.getUint16(data.byteOffset + prototype.BYTE.BIKE_SPEED_EVENT_TIME, true);

            // Byte 6-7 - Cumulative Speed Revolution LSB MSB - total number of wheel revolutions - rollover : 65536

            this.cumulativeSpeedRevolutionCount = dataView.getUint16(data.byteOffset + prototype.BYTE.CUMULATIVE_SPEED_REVOLUTION_COUNT, true);
    };

    SPDCADSharedPage.prototype.calcSpeed = function ()
    {

        var previousPage = this.profile.getPreviousPageValidateRolloverTime();

        if (!previousPage) { // Cannot calculate if no previous page is available
            return;
        }

      var  cumulativeSpeedRevolutionCountRollover,
        bikeSpeedEventTimeRollover,
        bikeSpeedEventTimeDifference;

         cumulativeSpeedRevolutionCountRollover = (this.cumulativeSpeedRevolutionCount < previousPage.cumulativeSpeedRevolutionCount);

 bikeSpeedEventTimeRollover = (this.bikeSpeedEventTime < previousPage.bikeSpeedEventTime);

        if (bikeSpeedEventTimeRollover) {
            bikeSpeedEventTimeDifference = 0xFFFF + (this.bikeSpeedEventTime - previousPage.bikeSpeedEventTime);
        } else {
            bikeSpeedEventTimeDifference = this.bikeSpeedEventTime - previousPage.bikeSpeedEventTime;
        }
        // SPEED

        // The speed equation does not multiply with the wheel circumfence calibration factor (in meters)
        // Higher-lever code, e.g viewmodel should take this into account

        if (bikeSpeedEventTimeDifference) {
            if (cumulativeSpeedRevolutionCountRollover) {
                this.relativeCumulativeSpeedRevolutionCount = this.cumulativeSpeedRevolutionCount - previousPage.cumulativeSpeedRevolutionCount;
                this.unCalibratedSpeed = 1024 * (0xFFFF - this.relativeCumulativeSpeedRevolutionCount) / bikeSpeedEventTimeDifference;
            }
            else {
                this.relativeCumulativeSpeedRevolutionCount = this.cumulativeSpeedRevolutionCount - previousPage.cumulativeSpeedRevolutionCount;
                this.unCalibratedSpeed = 1024 * this.relativeCumulativeSpeedRevolutionCount / bikeSpeedEventTimeDifference;

            }
        }

        // Filter "spikes"
        // This issue has been noticed running the SimulANT+ application Version : AYD 1.5.0.0
        // Its only the first few packets that provokes this for unCalibratedSpeed

        if (this.unCalibratedSpeed > 512)
        {
            if (this.log && this.log.logging) {
                this.log.log('warn', 'Very high uncalibrated speed filtered', this);
            }
            this.unCalibratedSpeed = undefined;
        }
    };

    SPDCADSharedPage.prototype.calcCadence = function ()
    {

        var previousPage = this.profile.getPreviousPageValidateRolloverTime();

        if (!previousPage) { // Cannot calculate if no previous page is available
            return;
        }


        var cumulativeCadenceRevolutionCountRollover,
            bikeCadenceEventTimeRollover,
            bikeCadenceEventTimeDifference;

        cumulativeCadenceRevolutionCountRollover = (this.cumulativeCadenceRevolutionCount < previousPage.cumulativeCadenceRevolutionCount);

        bikeCadenceEventTimeRollover = (this.bikeCadenceEventTime < previousPage.bikeCadenceEventTime);

        if (bikeCadenceEventTimeRollover) {
            bikeCadenceEventTimeDifference = 0xFFFF + (this.bikeCadenceEventTime - previousPage.bikeCadenceEventTime);
        } else {
            bikeCadenceEventTimeDifference = this.bikeCadenceEventTime - previousPage.bikeCadenceEventTime;
        }
        // CADENCE - RPM

        if (bikeCadenceEventTimeDifference) {
            if (cumulativeCadenceRevolutionCountRollover) {
                this.cadence = 61440 * (0xFFFF - this.cumulativeCadenceRevolutionCount + previousPage.cumulativeCadenceRevolutionCount) / bikeCadenceEventTimeDifference;
            } else {
                this.cadence = 61440 * (this.cumulativeCadenceRevolutionCount - previousPage.cumulativeCadenceRevolutionCount) / bikeCadenceEventTimeDifference;
            }
        }

        // Filter "spikes"
        // This issue has been noticed running the SimulANT+ application Version : AYD 1.5.0.0
        // Its only the first few packets that provokes this for unCalibratedSpeed

        if (this.cadence > 512) {
            if (this.log && this.log.logging) {
                this.log.log('warn', 'Very high cadence filtered', this);
            }
            this.cadence = undefined;

        }

    };

    return SPDCADSharedPage;

});
