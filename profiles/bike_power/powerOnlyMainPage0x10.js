/* global define: true, DataView: true */

define(['profiles/mainPage'], function _requireDefinePowerOnlyMainpage0x10(MainPage) {

    'use strict';

    function PowerOnlyMainPage0x10(configuration, broadcast, profile,pageNumber) {

        MainPage.call(this,configuration, broadcast, profile,pageNumber);
    }

    PowerOnlyMainPage0x10.prototype = Object.create(MainPage.prototype);
    PowerOnlyMainPage0x10.prototype.constructor = PowerOnlyMainPage0x10;

    PowerOnlyMainPage0x10.prototype.PEDAL_POWER_NOT_USED = 0xFF;
    PowerOnlyMainPage0x10.prototype.BIT_MASK = {
        PEDAL_POWER_PERCENT : parseInt("01111111",2),
        PEDAL_DIFFERENTIATION : parseInt("10000000",2)
    };

     PowerOnlyMainPage0x10.prototype.readPower = function ()
    {
         var data = this.broadcast.data,
             dataView = new DataView(data.buffer);

         this.updateEventCount = data[1];

         // Rollover 255
         this.pedalPower = data[2];

         if (this.pedalPower !== this.PEDAL_POWER_NOT_USED)
         {
             this.rightPedalPowerContribution = (data[2] & this.BIT_MASK.PEDAL_DIFFERENTIATION) >> 7;
             this.pedalPowerPercent = data[2] & this.BIT_MASK.PEDAL_POWER_PERCENT;
         }

         // 0-254 rpm, 255=invalid
         this.instantaneousCadence = data[3];

         this.accumulatedPower = dataView.getUint16(data.byteOffset+4,true);

         this.instantaneousPower = dataView.getUint16(data.byteOffset+6,true);

    };

     PowerOnlyMainPage0x10.prototype.readCommonBytes = function ()
    {
        this.readPower();
    };

    return PowerOnlyMainPage0x10;
});
