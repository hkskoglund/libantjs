/* global define: true, DataView: true */

define(['profiles/Page'], function (GenericPage) {

    'use strict';

    function SPDCADSharedPage(configuration, broadcast,profile,pageNumber) {

        GenericPage.call(this, configuration, broadcast,profile,pageNumber);

    }

    SPDCADSharedPage.prototype = Object.create(GenericPage.prototype);
    SPDCADSharedPage.prototype.constructor = SPDCADSharedPage;

    SPDCADSharedPage.prototype.readCadence = function()
    {
        var data = this.broadcast.data,
            dataView = this.dataView;

         // Byte 0-1 - Bike Cadence Event Time LSB MSB - last valid bike cadence event - unit: 1/1024s - rollover : 64 s

        this.bikeCadenceEventTime = dataView.getUint16(data.byteOffset, true);

        // Byte 2-3 - Cumulative Cadence Revolution Count LSB MSB - total number of pedal revolutions - rollover : 65536

        this.cumulativeCadenceRevolutionCount = dataView.getUint16(data.byteOffset + 2, true);
    };

    SPDCADSharedPage.prototype.readSpeed = function()
    {
        var data = this.broadcast.data,
            dataView = this.dataView;

            // Byte 4-5 - Bike speed event time LSB MSB - time of last valid bike speed event - unit : 1/1024 s, 64 s

            this.bikeSpeedEventTime = dataView.getUint16(data.byteOffset + 4, true);

            // Byte 6-7 - Cumulative Speed Revolution LSB MSB - total number of wheel revolutions - rollover : 65536

            this.cumulativeSpeedRevolutionCount = dataView.getUint16(data.byteOffset + 6, true);
    };

    SPDCADSharedPage.prototype.calcSpeed = function ()
    {

        var previousPage = this.previousPage;
        if (!previousPage) // Cannot calculate if no previous page is available
            return;

      var broadcast = this.broadcast,
         data = broadcast.data,
        dataView = this.dataView,
        deviceType = broadcast.channelId.deviceType,
        sensorId = broadcast.channelId.sensorId,
        cumulativeSpeedRevolutionCountRollover,
        bikeSpeedEventTimeRollover,
        bikeSpeedEventTimeDifference;

         cumulativeSpeedRevolutionCountRollover = (this.cumulativeSpeedRevolutionCount < previousPage.cumulativeSpeedRevolutionCount);

 bikeSpeedEventTimeRollover = (this.bikeSpeedEventTime < previousPage.bikeSpeedEventTime);

        if (bikeSpeedEventTimeRollover)
            bikeSpeedEventTimeDifference = 0xFFFF + (this.bikeSpeedEventTime - previousPage.bikeSpeedEventTime);
        else
            bikeSpeedEventTimeDifference = this.bikeSpeedEventTime - previousPage.bikeSpeedEventTime;

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
            if (this.log && this.log.logging)
                this.log.log('warn', 'Very high uncalibrated speed filtered', this);
            this.unCalibratedSpeed = undefined;
        }
    };


    return SPDCADSharedPage;

});
