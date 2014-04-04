/* global define: true, DataView: true */

define(['profiles/Page'], function _requireDefineSPDCADPage0(GenericPage) {
    'use strict';
   
    function SPDCADPage0(configuration, broadcast, previousPage) {

        GenericPage.call(this, configuration);

        this.type = GenericPage.prototype.TYPE.MAIN;

        this.previousPage = previousPage;

        this.timestamp = Date.now();

        //this.profile = broadcast.profile;

        if (broadcast.data)
            this.parse(broadcast);

    }

    SPDCADPage0.prototype = Object.create(GenericPage.prototype);
    SPDCADPage0.prototype.constructor = SPDCADPage0;

    // ANT Message byte layout - does not conform to ANT+ message format (1 byte datapagenumber/msb page toggle, 7 byte data)
    SPDCADPage0.prototype.BYTE = {
        BIKE_CADENCE_EVENT_TIME: 0,
        CUMULATIVE_CADENCE_REVOLUTION_COUNT: 2,
        BIKE_SPEED_EVENT_TIME: 4,
        CUMULATIVE_SPEED_REVOLUTION_COUNT: 6
    };

    
    SPDCADPage0.prototype.parse = function (broadcast) {

        var data = broadcast.data,
            dataView = new DataView(data.buffer),
            cumulativeCadenceRevolutionCountRollover,
            cumulativeSpeedRevolutionCountRollover,
            bikeCadenceEventTimeRollover,
            bikeSpeedEventTimeRollover,
            bikeSpeedEventTimeDifference,
            bikeCadenceEventTimeDifference,
            diffCumulativeSpeedRevolutionCountCount;

        this.broadcast = broadcast;

        this.number = 0;

        // Byte 0-1 - Bike Cadence Event Time LSB MSB - last valid bike cadence event - unit: 1/1024s - rollover : 64 s

        this.bikeCadenceEventTime = dataView.getUint16(data.byteOffset + SPDCADPage0.prototype.BYTE.BIKE_CADENCE_EVENT_TIME, true);

        // Byte 2-3 - Cumulative Cadence Revolution Cound LSB MSB - total number of pedal revolutions - rollover : 65536

        this.cumulativeCadenceRevolutionCount = dataView.getUint16(data.byteOffset + SPDCADPage0.prototype.BYTE.CUMULATIVE_CADENCE_REVOLUTION_COUNT, true);
        
        // Byte 4-5 - Bike speed event time LSB MSB - time of last valid bike speed event - unit : 1/1024 s, 64 s

        this.bikeSpeedEventTime = dataView.getUint16(data.byteOffset + SPDCADPage0.prototype.BYTE.BIKE_SPEED_EVENT_TIME, true);

        // Byte 6-7 - Cumulative Speed Revolution LSB MSB - total number of wheel revolutions - rollover : 65536

        this.cumulativeSpeedRevolutionCount = dataView.getUint16(data.byteOffset + SPDCADPage0.prototype.BYTE.CUMULATIVE_SPEED_REVOLUTION_COUNT, true);

        // Cadence
        // Spec. section 5.3.1 - Cadence computation, p. 29

        // Initialy we have no previous page, so have to check for previous page
        if (!this.previousPage)
          return;
        

            // Don't attempt to calculate cadence and speed if time between pages is greater than rollover time
            if (this.timestamp - this.previousPage.timestamp >= 64000) {
                if (this.log.logging) this.log.log('warn', 'Time between pages from is over rollover threshold, skipped cadence and speed calculation', this.page, this.previousPage);
                return;
            }

            cumulativeCadenceRevolutionCountRollover = (this.cumulativeCadenceRevolutionCount < this.previousPage.cumulativeCadenceRevolutionCount);

            cumulativeSpeedRevolutionCountRollover = (this.cumulativeSpeedRevolutionCount < this.previousPage.cumulativeSpeedRevolutionCount);

            bikeCadenceEventTimeRollover = (this.bikeCadenceEventTime < this.previousPage.bikeCadenceEventTime);

            bikeSpeedEventTimeRollover = (this.bikeSpeedEventTime < this.previousPage.bikeSpeedEventTime);


            if (bikeCadenceEventTimeRollover)
                bikeCadenceEventTimeDifference = 0xFFFF + (this.bikeCadenceEventTime - this.previousPage.bikeCadenceEventTime);
            else
                bikeCadenceEventTimeDifference = this.bikeCadenceEventTime - this.previousPage.bikeCadenceEventTime;

            // RPM - rounds pr minute

            // CADENCE

            if (bikeCadenceEventTimeDifference) {
                if (cumulativeCadenceRevolutionCountRollover)
                    this.cadence = 61440 * (0xFFFF - this.cumulativeCadenceRevolutionCount + this.previousPage.cumulativeCadenceRevolutionCount) / bikeCadenceEventTimeDifference;
                else 
                    this.cadence = 61440 * (this.cumulativeCadenceRevolutionCount - this.previousPage.cumulativeCadenceRevolutionCount) / bikeCadenceEventTimeDifference;
            }

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

            if (this.cadence > 512) {
                if (this.log && this.log.logging)
                    this.log.log('warn', 'Very high cadence filtered', this);
                this.cadence = undefined;

            }

    };

   
    SPDCADPage0.prototype.toString = function () {

        var calibrationFactor = 2.07, // Just used for a speed estimate
            speed,
            msg;
       
        msg = this.type + " P# " + this.number + " cadence (rpm) ";

        if (this.cadence !== undefined)
            msg += this.cadence;

        msg +=  " cadenceEventTime " + this.bikeCadenceEventTime + ' cadenceRevolution ' + this.cumulativeCadenceRevolutionCount;

       if (this.unCalibratedSpeed !== undefined) {
           speed = calibrationFactor * this.unCalibratedSpeed;
           msg += ' speed (m/s) ' + speed; 
       }

       msg += ' speedEventTime ' + this.bikeSpeedEventTime + ' wheelRevolution ' + this.cumulativeSpeedRevolutionCount +  ' default wheel size (m) ' + calibrationFactor;


        return msg;
    };

    return SPDCADPage0;

});
