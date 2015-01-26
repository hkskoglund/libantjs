/* global define: true, DataView: true */

define(['profiles/backgroundPage'], function (BackgroundPage) {

    'use strict';

    function ProductId(configuration,broadcast,profile,pageNumber)
    {
        BackgroundPage.call(this,configuration,broadcast,profile,pageNumber);

        this.read(broadcast);

    }

    ProductId.prototype = Object.create(BackgroundPage.prototype);
    ProductId.prototype.constructor = ProductId;

    ProductId.prototype.read = function (broadcast)
    {
        var data = broadcast.data,
            dataView = new DataView(data.buffer);

        // Byte 2 Supplemental software revision

        this.supplementalSWRevision = data[2];

         // Byte 3 Software revision - set by manufacturer

        this.SWRevision = data[3];

        this.SWRevisionString = this.getSWRevision();

        // Byte 4 LSB - 7 MSB Serial Number - little endian
        this.serialNumber = dataView.getUint32(data.byteOffset + 4, true);

    };

    ProductId.prototype.NO_SERIAL_NUMBER = 0xFFFFFFFF;

    ProductId.prototype.getSWRevision = function ()
    {
        var SWrev;

        if (this.SWRevision > 10)
        {
            SWrev = this.SWRevision/10;
        } else
        {
            SWrev = this.SWRevision;
        }

        // ANT+ Managed Network Document – Common Data Pages, Rev 2.4 , p. 23

        if (this.supplementalSWRevision !== 0xFF) // Invalid
        {
            if (this.supplementalSWRevision < 100)
            {
                SWrev += this.supplementalSWRevision/1000;
            }
            else
            {
                SWrev += this.supplementalSWRevision/10000;
            }
        }

        return SWrev.toString();
    };

    ProductId.prototype.toString = function () {
       var msg = "P# " + this.number+ ' ';

        msg += " SW revision " + this.SWRevisionString;

        if (this.serialNumber === ProductId.prototype.NO_SERIAL_NUMBER)
        {
            msg += " No serial number";
        } else
        {
            msg += " Serial number " + this.serialNumber;
        }

        return msg;
    };

    return ProductId;

});
