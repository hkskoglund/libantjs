/* global define: true, DataView: true */

define(['profiles/cumulativeOperatingTimeShared'], function (CumulativeOperatingTimeShared) {

    'use strict';

    function CumulativeOperatingTime(configuration,broadcast,profile,pageNumber)
    {
        CumulativeOperatingTimeShared.call(this,configuration,broadcast,profile,pageNumber);

        this.type = this.TYPE.BACKGROUND;

        this.readCumulativeOperatingTime(broadcast,1);

    }

    CumulativeOperatingTime.prototype = Object.create(CumulativeOperatingTimeShared.prototype);
    CumulativeOperatingTime.prototype.constructor = CumulativeOperatingTime;


    CumulativeOperatingTime.prototype.toString = function () {
          var msg = this.type + " P# " + this.number +" Cumulative operating time  " + this.cumulativeOperatingTimeString;

        return msg;
    };


    return CumulativeOperatingTime;

});
