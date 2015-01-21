/* global define: true */

define(['profiles/cumulativeOperatingTimeShared'], function (CumultiveOperatingTimeShared) {

    'use strict';

    function CumulativeOperatingTime(configuration,broadcast,profile,pageNumber)
    {

       CumultiveOperatingTimeShared.call(this,configuration,broadcast,profile,pageNumber);

       this.read(broadcast);

    }

    CumulativeOperatingTime.prototype = Object.create(CumultiveOperatingTimeShared.prototype);
    CumulativeOperatingTime.prototype.constructor = CumulativeOperatingTime;


    // Background Page 1
    CumulativeOperatingTime.prototype.read = function (broadcast)
    {
        var data = broadcast.data;

        // Byte 1-2 - reserved 0xFF

        // Byte 7

        this.descriptive = {
            coarseVoltage: data[7] & 0x0F,
            batteryStatus: new BatteryStatus(data),
            resoultion: (data[7] & 0x80) >> 7 // Bit 7 0 = 16 s, 1 = 2 s
        };

        var unit_multiplier = (this.descriptive.resolution === 1) ? 2 : 16;

        // Byte 3-5

        this.readCumulativeOperatingTime(broadcast,3,unit_multiplier);

        // Byte 6

        this.fractionalBatteryVoltage = data[6] / 256; // Volt
        if (this.descriptive.coarseVoltage !== 0x0F) {
            this.batteryVoltage = this.fractionalBatteryVoltage + this.descriptive.coarseVoltage;
        }
    };

    CumulativeOperatingTime.prototype.toString = function () {
       var  msg = "P# " + this.number + " Cumulative operating time ";

        msg += this.cumulativeOperatingTimeString + ' Battery reset ca. ' + this.lastBatteryReset;

        if (this.descriptive.coarseVoltage !== 0x0F) { // Filter invalid voltage
            msg += " Battery (V) " + this.batteryVoltage.toFixed(1);
        }

        msg += " Battery status " + this.descriptive.batteryStatus.toString();

        return msg;
    };

    function BatteryStatus (dataByte)
    {
        this.batteryStatus = (dataByte & 0x70) >> 4;
    }

    BatteryStatus.prototype.toString = function ()
    {
        var batteryStatusString;

        switch (this.batteryStatus) {
            case 0x00: batteryStatusString = "Reserved"; break;
            case 0x01: batteryStatusString = "New"; break;
            case 0x02: batteryStatusString = "Good"; break;
            case 0x03: batteryStatusString = "OK"; break;
            case 0x04: batteryStatusString = "Low"; break;
            case 0x05: batteryStatusString = "Critical"; break;
            case 0x06: batteryStatusString = "Reserved"; break;
            case 0x07: batteryStatusString = "Invalid"; break;
            default:   batteryStatusString = "? - " + this.batteryStatus;
        }

        return batteryStatusString;
    };

    return CumulativeOperatingTime;

});
