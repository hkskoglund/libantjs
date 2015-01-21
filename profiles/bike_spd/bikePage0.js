/* global define: true */

define(['profiles/bike_spdcad/SPDCADShared'], function _requireDefineBikePage0(SPDCADSharedPage) {

    'use strict';

    function BikePage0(configuration, broadcast, profile,pageNumber) {

        SPDCADSharedPage.call(this,configuration, broadcast, profile,pageNumber);

    }

    BikePage0.prototype = Object.create(SPDCADSharedPage.prototype);
    BikePage0.prototype.constructor = BikePage0;

     // ANT Message byte layout - does not conform to ANT+ message format (1 byte datapagenumber/msb page toggle, 7 byte data)
    BikePage0.prototype.BYTE = {

        BIKE_SPEED_EVENT_TIME: 4,
        CUMULATIVE_SPEED_REVOLUTION_COUNT: 6
    };

    BikePage0.prototype.readCommonBytes = function ()
    {
         this.readSpeed();
    };

    BikePage0.prototype.update = function ()
    {
          this.calcSpeed();
    };

    BikePage0.prototype.toString = function () {

        var calibrationFactor = 2.07, // Just used for a speed estimate
            speed,
            msg;

        msg = "P# " + this.number;

       if (this.unCalibratedSpeed !== undefined) {
           speed = calibrationFactor * this.unCalibratedSpeed;
           msg += ' speed (m/s) ' + speed;
       }

       msg += ' speedEventTime ' + this.bikeSpeedEventTime + ' wheelRevolution ' + this.cumulativeSpeedRevolutionCount +  ' default wheel size (m) ' + calibrationFactor;

        return msg;
    };

    return BikePage0;

});
