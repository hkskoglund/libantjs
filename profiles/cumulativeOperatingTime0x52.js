/* global define: true */

define(['profiles/cumulativeOperatingTimeShared'], function (CumultiveOperatingTimeShared) {

    'use strict';

    function CumulativeOperatingTime(configuration,broadcast,profile,pageNumber)
    {
       CumultiveOperatingTimeShared.call(this,configuration,broadcast,profile,pageNumber);

        this.type = this.TYPE.BACKGROUND;

        this.read(broadcast);

    }

    CumulativeOperatingTime.prototype = Object.create(CumultiveOperatingTimeShared.prototype);
    CumulativeOperatingTime.prototype.constructor = CumulativeOperatingTime;

    // Background Page 1
    CumulativeOperatingTime.prototype.read = function (broadcast)
    {
        var data = broadcast.data;

        // Byte 1-2 -reserved 0xFF

        // Byte 7

        this.descriptive = {
            coarseVoltage: data[7] & 0x0F,
            batteryStatus: (data[7] & 0x70) >> 4,
            resoultion: (data[7] & 0x80) >> 7 // Bit 7 0 = 16 s, 1 = 2 s
        };


        switch (this.descriptive.batteryStatus) {
            case 0x00: this.batteryStatusString = "Reserved"; break;
            case 0x01: this.batteryStatusString = "New"; break;
            case 0x02: this.batteryStatusString = "Good"; break;
            case 0x03: this.batteryStatusString = "OK"; break;
            case 0x04: this.batteryStatusString = "Low"; break;
            case 0x05: this.batteryStatusString = "Critical"; break;
            case 0x06: this.batteryStatusString = "Reserved"; break;
            case 0x07: this.batteryStatusString = "Invalid"; break;
            default: this.batteryStatusString = "? - " + this.descriptive.batteryStatus;
        }

        var unit_multiplier = (this.descriptive.resolution === 1) ? 2 : 16;

        // Byte 3-5

        this.readCumulativeOperatingTime(broadcast,3,unit_multiplier);

        // Byte 6

        this.fractionalBatteryVoltage = data[6] / 256; // Volt
        if (this.descriptive.coarseVoltage === 0x0F)
            this.batteryVoltage = "Invalid";
        else
            this.batteryVoltage = this.fractionalBatteryVoltage + this.descriptive.coarseVoltage;

    };

    CumulativeOperatingTime.prototype._batteryVoltageToString = function (voltage) {

        if (typeof voltage === "number")
            return voltage.toFixed(1);
        else
            return "" + voltage;
    };

    CumulativeOperatingTime.prototype.toString = function () {
       var  msg = this.type + " P# " + this.number + " Cumulative operating time ";

        msg += this.cumulativeOperatingTimeString + ' Battery reset ca. ' + this.lastBatteryReset;

        if (this.descriptive.coarseVoltage !== 0x0F) // Filter invalid voltage
            msg += " Battery (V) " + this._batteryVoltageToString(this.batteryVoltage);

        msg += " Battery status " + this.batteryStatusString;

        return msg;
    };

    return CumulativeOperatingTime;

});
