/* global define: true, DataView: true */

define(['profiles/backgroundPage'], function (BackgroundPage) {

    'use strict';

    function CumulativeOperatingTime(configuration,broadcast,profile,pageNumber)
    {
        BackgroundPage.call(this,configuration,broadcast,profile,pageNumber);
    }

    CumulativeOperatingTime.prototype = Object.create(BackgroundPage.prototype);
    CumulativeOperatingTime.prototype.constructor = CumulativeOperatingTime;

    CumulativeOperatingTime.prototype.readCumulativeOperatingTime = function (broadcast,offset,unit_multiplier)
        {
            var data = broadcast.data,
                dataView = new DataView(data.buffer),
                multiplier = unit_multiplier|| 2; // Default 2

          var toStringCumulativeOperatingTime = function (cumulativeOperatingTime) {

            if (cumulativeOperatingTime < 3600)
                return cumulativeOperatingTime.toFixed(1) + 's ';
            else
                return (this.cumulativeOperatingTime / 3600).toFixed(1) + ' h';
          }.bind(this);

            // Cumulative operating time :
            // Byte 1 = bit 0-7, Byte 2 = bit 8-15, Byte 3 = bit 16 - 23 (little endian)

            this.cumulativeOperatingTime = (dataView.getUint32(data.byteOffset+offset,true) & 0x00FFFFFF) * multiplier; // Seconds since reset/battery replacement

        this.cumulativeOperatingTimeString = toStringCumulativeOperatingTime(this.cumulativeOperatingTime);

            this.lastBatteryReset = (new Date(Date.now() - this.cumulativeOperatingTime * 1000)).toLocaleString();
        };

    return CumulativeOperatingTime;

});
