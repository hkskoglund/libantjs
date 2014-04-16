/* global define: true, DataView: true */

define(['profiles/Page'], function (GenericPage) {

    'use strict';

    function CumulativeOperatingTime(configuration,broadcast,profile,pageNumber)
    {
        GenericPage.call(this,configuration,broadcast,profile,pageNumber);
    }

    CumulativeOperatingTime.prototype = Object.create(GenericPage.prototype);
    CumulativeOperatingTime.prototype.constructor = CumulativeOperatingTime;


    CumulativeOperatingTime.prototype.readCumulativeOperatingTime = function (broadcast,offset,unit_multiplier)
        {
            var data = broadcast.data,
                dataView = new DataView(data.buffer),
                multiplier = unit_multiplier|| 2; // Default 2

            // Cumulative operating time :
            // Byte 1 = bit 0-7, Byte 2 = bit 8-15, Byte 3 = bit 16 - 23 (little endian)

            this.cumulativeOperatingTime = (dataView.getUint32(data.byteOffset+offset,true) & 0x00FFFFFF) * multiplier; // Seconds since reset/battery replacement

              // Must look up to generic page through prototype chain (only 1 level should not affect performance considerably)
            this.cumulativeOperatingTimeString = this.toStringCumulativeOperatingTime(this.cumulativeOperatingTime);

            this.lastBatteryReset = (new Date(Date.now() - this.cumulativeOperatingTime * 1000)).toLocaleString();
        };

    CumulativeOperatingTime.prototype.toStringCumulativeOperatingTime = function (cumulativeOperatingTime) {

            if (cumulativeOperatingTime < 3600)
                return cumulativeOperatingTime.toFixed(1) + 's ';
            else
                return (this.cumulativeOperatingTime / 3600).toFixed(1) + ' h';

        };

    return CumulativeOperatingTime;

});