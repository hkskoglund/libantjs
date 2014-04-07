/* global define: true */

define(['profiles/Page'], function _requireDefineBikeSpdPage(GenericPage) {

    'use strict';

    function BikeSpdPage(configuration) {
        GenericPage.call(this,configuration);

      //  this.bikeSpeedEventTime = undefined;
      //  this.cumulativeSpeedRevolutionCount = undefined;

    }

    BikeSpdPage.prototype = Object.create(GenericPage.prototype);
    BikeSpdPage.prototype.constructor = BikeSpdPage;

     // ANT Message byte layout - does not conform to ANT+ message format (1 byte datapagenumber/msb page toggle, 7 byte data)
    BikeSpdPage.prototype.BYTE = {

        BIKE_SPEED_EVENT_TIME: 4,
        CUMULATIVE_SPEED_REVOLUTION_COUNT: 6
    };
    // Deviceprofile p. 17 "Bytes 4-7 have the same definition for every data page"
    BikeSpdPage.prototype.readCommonBytes = function (data,dataView)
    {

         // Byte 0

        this.changeToggle = (data[0] & this.BIT_MASK.PAGE_TOGGLE) >> 7;
        this.number = data[0] & this.BIT_MASK.PAGE_NUMBER;

          // Byte 4-5 - Bike speed event time LSB MSB - time of last valid bike speed event - unit : 1/1024 s, 64 s

        this.bikeSpeedEventTime = dataView.getUint16(data.byteOffset + this.BYTE.BIKE_SPEED_EVENT_TIME, true);

        // Byte 6-7 - Cumulative Speed Revolution LSB MSB - total number of wheel revolutions - rollover : 65536

        this.cumulativeSpeedRevolutionCount = dataView.getUint16(data.byteOffset + this.BYTE.CUMULATIVE_SPEED_REVOLUTION_COUNT, true);

    };


    return BikeSpdPage;

});
