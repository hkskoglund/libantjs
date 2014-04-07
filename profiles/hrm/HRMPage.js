/* global define: true */

define(['profiles/Page'], function _requireDefineHRMPage(GenericPage) {

    'use strict';

    function HRMPage(configuration) {

        GenericPage.call(this,configuration);

      //  this.bikeSpeedEventTime = undefined;
      //  this.cumulativeSpeedRevolutionCount = undefined;

    }

    HRMPage.prototype = Object.create(GenericPage.prototype);
    HRMPage.prototype.constructor = HRMPage;

    // Deviceprofile p. 17 "Bytes 4-7 have the same definition for every data page"
    HRMPage.prototype.readCommonBytes = function (data,dataView)
    {

         // Byte 0

        this.changeToggle = (data[0] & this.BIT_MASK.PAGE_TOGGLE) >> 7;
        this.number = data[0] & this.BIT_MASK.PAGE_NUMBER;

          // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
        this.heartBeatEventTime = dataView.getUint16(data.byteOffset+4,true);

        // Counter for each heart beat event, rollover 255 counts
        this.heartBeatCount = data[6];

        // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
        this.computedHeartRate = data[7];

    };

    return HRMPage;

});
