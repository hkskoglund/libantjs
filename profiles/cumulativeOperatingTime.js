/* global define: true */

define(['profiles/cumulativeOperatingTimeShared'], function (CumulativeOperatingTimeShared) {

    'use strict';

    function CumulativeOperatingTime(configuration,broadcast,profile,pageNumber)
    {
        CumulativeOperatingTimeShared.call(this,configuration,broadcast,profile,pageNumber);

        this.readCumulativeOperatingTime(broadcast,1);

    }

    CumulativeOperatingTime.prototype = Object.create(CumulativeOperatingTimeShared.prototype);
    CumulativeOperatingTime.prototype.constructor = CumulativeOperatingTime;

    CumulativeOperatingTime.prototype.toString = function () {

          var msg = "P# " + this.number +" Cumulative operating time  " + this.cumulativeOperatingTimeString;

        return msg;
    };

    return CumulativeOperatingTime;

});
