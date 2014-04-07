/* global define: true, DataView: true */

define(['profiles/bike_spd/bikeSpdPage'],function (BikeSpdPage) {

    'use strict';

    function BikeSpdPage1(configuration,broadcast,previousPage) {

       BikeSpdPage.call(this,configuration);

       this.type = this.TYPE.BACKGROUND;

       //this.profile = broadcast.profile;

       if (broadcast.data)
           this.parse(broadcast,previousPage);
    }

    BikeSpdPage1.prototype = Object.create(BikeSpdPage.prototype);
    BikeSpdPage1.prototype.constructor = BikeSpdPage1;

    BikeSpdPage1.prototype.parse = function (broadcast)
    {
        var data = broadcast.data,
            dataView = new DataView(data.buffer);

        this.broadcast = broadcast;

        this.readCommonBytes(data,dataView);

        this.readCumulativeOperatingTime(data,dataView);


    };

    // Override default .toString on Object.prototype
    BikeSpdPage1.prototype.toString = function () {
          var msg = this.type + " P# " + this.number +" Cumulative operating time  " + this.cumulativeOperatingTimeString;

        return msg;
    };

   return BikeSpdPage1;


});
