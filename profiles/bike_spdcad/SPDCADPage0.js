/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define( function _requireDefineSPDCADPage0(require,exports,module){

    'use strict';

    var SPDCADSharedPage = require('../bike_spdcad/SPDCADShared');

    function SPDCADPage0(configuration, broadcast,profile,pageNumber){

        SPDCADSharedPage.call(this, configuration, broadcast,profile,pageNumber,64000);


    }

    SPDCADPage0.prototype = Object.create(SPDCADSharedPage.prototype);
    SPDCADPage0.prototype.constructor = SPDCADPage0;

    // ANT Message byte layout - does not conform to ANT+ message format (1 byte datapagenumber/msb page toggle, 7 byte data)
    SPDCADPage0.prototype.BYTE = {
        BIKE_CADENCE_EVENT_TIME: 0,
        CUMULATIVE_CADENCE_REVOLUTION_COUNT: 2,
        BIKE_SPEED_EVENT_TIME: 4,
        CUMULATIVE_SPEED_REVOLUTION_COUNT: 6
    };

    SPDCADPage0.prototype.readCommonBytes = function ()
    {
        this.readCadence();
        this.readSpeed();
    };

    SPDCADPage0.prototype.update = function (){

       this.calcSpeed();
       this.calcCadence();

    };

    SPDCADPage0.prototype.toString = function (){

        var calibrationFactor = 2.07, // Just used for a speed estimate
            speed,
            msg;

        msg = "P# " + this.number + " cadence (rpm) ";

        if (this.cadence !== undefined){
            msg += this.cadence;
        }

        msg +=  " cadenceEventTime " + this.bikeCadenceEventTime + ' cadenceRevolution ' + this.cumulativeCadenceRevolutionCount;

       if (this.unCalibratedSpeed !== undefined){
           speed = calibrationFactor * this.unCalibratedSpeed;
           msg += ' speed (m/s) ' + speed;
       }

       msg += ' speedEventTime ' + this.bikeSpeedEventTime + ' wheelRevolution ' + this.cumulativeSpeedRevolutionCount +  ' default wheel size (m) ' + calibrationFactor;


        return msg;
    };

    module.exports = SPDCADPage0;
    return module.exports;

});
