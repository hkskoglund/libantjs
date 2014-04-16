/* global define: true, DataView: true */

define(['profiles/Page'], function (GenericPage) {

    'use strict';

    function ProductId(configuration,broadcast,profile,pageNumber)
    {
        GenericPage.call(this,configuration,broadcast,profile,pageNumber);

        this.type = this.TYPE.BACKGROUND;

        this.read(broadcast);

    }

    ProductId.prototype = Object.create(GenericPage.prototype);
    ProductId.prototype.constructor = ProductId;

    ProductId.prototype.read = function (broadcast)
    {
        var data = broadcast.data,
            dataView = new DataView(data.buffer);

         // Byte 3 Software revision - set by manufacturer

        this.SWRevision = data[3];

        // Byte 4 LSB - 7 MSB Serial Number - little endian
        this.serialNumber = dataView.getUint32(data.byteOffset + 4, true);

    };

    ProductId.prototype.NO_SERIAL_NUMBER = 0xFFFFFFFF;


    ProductId.prototype.toString = function () {
       var msg = this.type + " P# " + this.number + " SW revision " + this.SWRevision;

        if (this.serialNumber === ProductId.prototype.NO_SERIAL_NUMBER)
            msg += " No serial number";
        else
            msg += " Serial number " + this.serialNumber;

        return msg;
    };

    return ProductId;

});
