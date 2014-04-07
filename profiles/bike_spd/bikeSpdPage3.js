/* global define: true, DataView: true */

define(['profiles/bike_spd/bikeSpdPage'],function (BikeSpdPage) {

    'use strict';

    function BikeSpdPage3(configuration,broadcast) {

       BikeSpdPage.call(this,configuration);

       this.type = this.TYPE.BACKGROUND;

       //this.profile = broadcast.profile;

       if (broadcast.data)
           this.parse(broadcast);
    }

    BikeSpdPage3.prototype = Object.create(BikeSpdPage.prototype);
    BikeSpdPage3.prototype.constructor = BikeSpdPage3;

    BikeSpdPage3.prototype.parse = function (broadcast)
    {
          var  data = broadcast.data, dataView = new DataView(data.buffer);

        this.broadcast = broadcast;

        this.readCommonBytes(data,dataView);

        this.readProductId(data);


    };

    BikeSpdPage3.prototype.toString = function () {
       var msg = this.type + " P# " + this.number +" HW ver. " + this.hardwareVersion + " SW ver. " + this.softwareVersion + " Model " + this.modelNumber;

        return msg;
    };

    return BikeSpdPage3;


});
