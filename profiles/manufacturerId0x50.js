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

         var data = broadcast.data,
             dataView = new DataView(data.buffer);

        // Byte 3  - HW revision - set by manufaturer

        this.HWRevision = data[3];

        // Byte 4 LSB - 5 MSB - little endian

        this.manufacturerID = dataView.getUint16(data.byteOffset + 4, true);

        this.manufacturerString = this.getManufacturer(this.manufacturerID)+' '+this.manufacturerID;

        // Byte 6 LSB - 7 MSB - little endian

        this.modelNumber = dataView.getUint16(data.byteOffset + 6, true);

    };

    ManufacturerId.prototype.toString = function () {

      var msg =  " P# " + this.number + " Manufacturer " +this.manufacturerString+' '+ this.manufacturerID + " HW rev. " + this.HWRevision + " Model nr. " + this.modelNumber;


     return msg;
    };


    return ManufacturerId;

});
