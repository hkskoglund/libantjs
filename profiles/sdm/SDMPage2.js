/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';

    var GenericPage = require('profiles/Page');

    
    function SDMPage2(configuration, broadcast) {

        GenericPage.call(this, configuration, broadcast);

  if (broadcast)
            this.profile = broadcast.profile;

        if (broadcast && broadcast.data)
            this.parse(broadcast);

        this.status = {
            SDMLocation: undefined,
            BatteryStatus: undefined,
            SDMHealth: undefined,
            UseState: undefined
        };
    }

    SDMPage2.prototype = Object.create(GenericPage.prototype);
    SDMPage2.prototype.constructor = SDMPage2;

    // Bit field layout
    SDMPage2.prototype.BIT_FIELD = {

        SDMLocation: { START_BIT: 6, LENGTH: 2 },
        BatteryStatus: { START_BIT: 4, LENGTH: 2 },
        SDMHealth: { START_BIT: 2, LENGTH: 2 },
        UseState: { START_BIT: 0, LENGTH: 2 },

        CadenceFractional : { START_BIT : 4, LENGTH : 4}


    };

    // Bit mask to pinpoint BIT_FIELD

    SDMPage2.prototype.BIT_MASK = {

        SDMLocation: parseInt("11000000",2),
        BatteryStatus: parseInt("00110000",2),
        SDMHealth: parseInt("00001100",2),
        UseState: parseInt("00000011",2),

        UPPER_NIBBLE: 0xF0,
        LOWER_NIBBLE: 0X0F

    };

    // Byte layout
    SDMPage2.prototype.BYTE = {
        PAGE_NUMBER: 0,
        RESERVED_1 : 1,
        RESERVED_2 : 2,
        CADENCE_INTEGER: 3,
        CADENCE_FRACTIONAL: 4, // Upper nibble
        SPEED_INTEGER: 4, // Lower nibble
        SPEED_FRACTIONAL: 5,
        RESERVED_6: 6,
        STATUS : 7
       
    };

    SDMPage2.prototype.UNIT = {
        CADENCE_FRACTIONAL: 1/16, // strides pr minute
        SPEED_FRACTIONAL : 1/256 // m/s
    };


    SDMPage2.prototype.parse = function (broadcast) {
       
        var data = broadcast.data;
        // dataView = new DataView(data.buffer);

        this.broadcast = broadcast;

        // Byte 0 - data page number

        this.number = data[SDMPage2.prototype.BYTE.PAGE_NUMBER];

        // Byte 1 - reserved 0 x FF

        // Byte 2 - reserved 0 x FF

        // Byte 3 - cadence - integer

        this.cadenceInteger = data[SDMPage2.prototype.BYTE.CADENCE_INTEGER];
        
        // Byte 4 - cadence fractional upper nibble
        this.cadenceFractional = ((data[SDMPage2.prototype.BYTE.CADENCE_FRACTIONAL] & SDMPage2.prototype.BIT_MASK.UPPER_NIBBLE) >> SDMPage2.prototype.BIT_FIELD.CadenceFractional.START_BIT) * (SDMPage2.prototype.UNIT.CADENCE_FRACTIONAL); // Strides pr min.
        this.cadence = this.cadenceInteger + this.cadenceFractional;

        this.speedInteger = data[SDMPage2.prototype.BYTE.SPEED_INTEGER] & SDMPage2.prototype.BIT_MASK.LOWER_NIBBLE; // lower 4 bit

        // Byte 5 - fractional instantenous speed
        this.speedFractional = data[SDMPage2.prototype.BYTE.SPEED_FRACTIONAL] * SDMPage2.prototype.UNIT.SPEED_FRACTIONAL;
        this.speed = this.speedInteger + this.speedFractional;

        // Byte 6 - reserved 0xFF

        // Byte 7 - status - SDM status flags

        this.status.SDMLocation = (data[SDMPage2.prototype.BYTE.STATUS] & SDMPage2.prototype.BIT_MASK.SDMLocation) >> SDMPage2.prototype.BIT_FIELD.SDMLocation.START_BIT;
        this.status.BatteryStatus = (data[SDMPage2.prototype.BYTE.STATUS] & SDMPage2.prototype.BIT_MASK.BatteryStatus) >> SDMPage2.prototype.BIT_FIELD.BatteryStatus.START_BIT;
         this.status.SDMHealth = (data[SDMPage2.prototype.BYTE.STATUS] & SDMPage2.prototype.BIT_MASK.SDMHealth) >> SDMPage2.prototype.BIT_FIELD.SDMHealth.START_BIT;
         this.status.UseState = (data[SDMPage2.prototype.BYTE.STATUS] & SDMPage2.prototype.BIT_MASK.UseState);
       

        switch (this.status.SDMLocation) {
            case 0x00: this.status.SDMLocationFriendly = "Laces"; break;
            case 0x01: this.status.SDMLocationFriendly = "Midsole"; break;
            case 0x02: this.status.SDMLocationFriendly = "Other"; break;
            case 0x03: this.status.SDMLocationFriendly = "Ankle"; break;
            default: this.status.SDMLocationFriendly = "? " + this.status.SDMLocation; break;
        }

        switch (this.status.BatteryStatus) {
            case 0x00: this.status.BatteryStatusFriendly = "New"; break;
            case 0x01: this.status.BatteryStatusFriendly = "Good"; break;
            case 0x02: this.status.BatteryStatusFriendly = "OK"; break;
            case 0x03: this.status.BatteryStatusFriendly = "Low battery"; break;
            default: this.status.BatteryStatusFriendly = "? " + this.status.BatteryStatus; break;
        }

        switch (this.status.SDMHealth) {
            case 0x00: this.status.SDMHealthFriendly = "OK"; break;
            case 0x01: this.status.SDMHealthFriendly = "Error"; break;
            case 0x02: this.status.SDMHealthFriendly = "Warning"; break;
            case 0x03: this.status.SDMHealthFriendly = "Reserved"; break;
            default: this.status.SDMHealthFriendly = "? " + this.status.SDMHealth; break;
        }

        switch (this.status.UseState) {
            case 0x00: this.status.UseStateFriendly = "IN-ACTIVE"; break;
            case 0x01: this.status.UseStateFriendly = "ACTIVE"; break;
            case 0x02: this.status.UseStateFriendly = "Reserved"; break;
            case 0x03: this.status.UseStateFriendly = "Reserved"; break;
            default: this.status.UseStateFriendly = "? " + this.status.UseState; break;
        }
     

    };

    SDMPage2.prototype.toString = function () {
       
        var msg = "P# " + this.number + " ",
            UNUSED = 0x00;

        if (this.cadence !== UNUSED)
            msg += "Cadence : " + this.cadence.toFixed(1) + " strides/min ";
        else
            msg += "Cadence : 0";

        if (this.speed !== UNUSED)
            msg += " Speed : " + this.speed.toFixed(1);
        else
            msg += " Speed : 0";


        msg += " Location: " + this.status.SDMLocationFriendly + " Battery: " + this.status.BatteryStatusFriendly + " Health: " + this.status.SDMHealthFriendly + " State: " + this.status.UseStateFriendly;

        return msg;
    };

    module.exports = SDMPage2;

    return module.exports;

});
