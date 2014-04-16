/* global define: true, DataView: true */

define(['profiles/Page'], function (GenericPage) {

    'use strict';

    function ManufacturerId(configuration,broadcast,profile,pageNumber)
    {
        GenericPage.call(this,configuration,broadcast,profile,pageNumber);

        this.type = this.TYPE.BACKGROUND;

        this.read(broadcast);

    }

    ManufacturerId.prototype = Object.create(GenericPage.prototype);
    ManufacturerId.prototype.constructor = ManufacturerId;

    // Background Page 2
    ManufacturerId.prototype.read = function (broadcast)
    {

         var channelId = broadcast.channelId,
             data = broadcast.data,
             dataView = new DataView(data.buffer);

      // Byte 3  - HW revision - set by manufaturer

        this.HWRevision = data[3];

        // Byte 4 LSB - 5 MSB - little endian
        this.manufacturerID = dataView.getUint16(data.byteOffset + 4, true);

        // Byte 6 LSB - 7 MSB - little endian
        this.modelNumber = dataView.getUint16(data.byteOffset + 6, true);

    };

    ManufacturerId.prototype.toString = function () {

      var msg = this.type + " P# " + this.number + " Manufacturer " + this.manufacturerID + " HW revision " + this.HWRevision + " Model nr. " + this.modelNumber;


     return msg;
    };


    return ManufacturerId;

});
