/* global define: true, DataView: true */

define(['profiles/bike_spd/bikeSpdPage'],function (BikeSpdPage) {

    'use strict';

    function BikeSpdPage2(configuration,broadcast) {

       BikeSpdPage.call(this,configuration);

       this.type = this.TYPE.BACKGROUND;

       //this.profile = broadcast.profile;

       if (broadcast.data)
           this.parse(broadcast);

    }

    BikeSpdPage2.prototype = Object.create(BikeSpdPage.prototype);
    BikeSpdPage2.prototype.constructor = BikeSpdPage2;

    BikeSpdPage2.prototype.parse = function (broadcast)
    {

          var  data = broadcast.data, dataView = new DataView(data.buffer);

        this.broadcast = broadcast;

        this.readCommonBytes(data,dataView);

        this.readManufacturerId(data,dataView,broadcast);

    };

    BikeSpdPage2.prototype.toString = function () {
        var  msg = this.type + " P# " + this.number +" Manufacturer " + this.manufacturerID + " serial num. : " + this.serialNumber;

        return msg;
    };

    return BikeSpdPage2;

});
