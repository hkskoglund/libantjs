/* global define: true, DataView: true */

define(['profiles/backgroundPage'], function (BackgroundPage) {

    'use strict';

    function ManufacturerId(configuration,broadcast,profile,pageNumber)
    {
        BackgroundPage.call(this,configuration,broadcast,profile,pageNumber);

        this.read(broadcast);

    }

    ManufacturerId.prototype = Object.create(BackgroundPage.prototype);
    ManufacturerId.prototype.constructor = ManufacturerId;

    // Background Page 2

    ManufacturerId.prototype.read = function (broadcast)
    {

         var channelId = broadcast.channelId,
             data = broadcast.data,
             dataView = new DataView(data.buffer);

        this.manufacturerID = data[1];

         this.manufacturerString = this.getManufacturer(this.manufacturerID)+' '+this.manufacturerID;


        this.serialNumber16MSB = dataView.getUint16(data.byteOffset+2,true); // Upper 16-bits of a 32 bit serial number

        // Set the lower 2-bytes of serial number, if available in channel Id.

        if (typeof channelId !== "undefined" && typeof channelId.deviceNumber !== "undefined")
            //this.serialNumber = (this.serialNumber16MSB << 16) | channelId.deviceNumber; Javascript limit: 32-bit bigendian signed on bitwise operators
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators
        {
            this.serialNumber = this.serialNumber16MSB * 0x10000 + channelId.deviceNumber;
        }
        else {
            this.serialNumber = this.serialNumber16MSB;
        }

    };

    ManufacturerId.prototype.toString = function () {
      var  msg = " P# " + this.number +" Manufacturer " + this.manufacturerString+' '+ this.manufacturerID + " serial num. : " + this.serialNumber;

     return msg;
    };

    return ManufacturerId;

});
