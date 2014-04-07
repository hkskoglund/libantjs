/* global define: true, DataView: true */

define(['logger'],function _requireDefineGenericPage(Logger) {

    'use strict';

    function GenericPage(configuration, broadcast) {

        this.log = new Logger(configuration);

        if (broadcast) {
            this.broadcast = broadcast;
            // this.profile = broadcast.profile;
        }

    }

    GenericPage.prototype.BIT_MASK = {
        PAGE_NUMBER : parseInt("01111111",2), // 7 lsb of byte 0 ANT+ format
        PAGE_TOGGLE : parseInt("10000000",2) // msb of byte 0 ANT+ format
    };

    GenericPage.prototype.COMMON = {
        PAGE80: 0x50,
        PAGE81: 0x51,
        PAGE82: 0x52
    }; // Battery status

    GenericPage.prototype.NO_SERIAL_NUMBER = 0xFFFFFFFF;

    // Background Page 1
    GenericPage.prototype.readCumulativeOperatingTime = function (data,dataView)
    {
        // Cumulative operating time :
        // Byte 1 = bit 0-7, Byte 2 = bit 8-15, Byte 3 = bit 16 - 23 (little endian)

        this.cumulativeOperatingTime = (dataView.getUint32(data.byteOffset+1,true) & 0x00FFFFFF) * 2; // Seconds since reset/battery replacement

          // Must look up to generic page through prototype chain (only 1 level should not affect performance considerably)
        this.cumulativeOperatingTimeString = this.toStringCumulativeOperatingTime(this.cumulativeOperatingTime);

        this.lastBatteryReset = (new Date(Date.now() - this.cumulativeOperatingTime * 1000)).toLocaleString();
    };

    // Background page 2
    GenericPage.prototype.readManufacturerId = function (data,dataView,broadcast)
    {
        var channelId = broadcast.channelId;

         this.manufacturerID = data[1];

        this.serialNumber16MSB = dataView.getUint16(data.byteOffset+2,true); // Upper 16-bits of a 32 bit serial number

        // Set the lower 2-bytes of serial number, if available in channel Id.
        if (typeof channelId !== "undefined" && typeof channelId.deviceNumber !== "undefined")
            this.serialNumber = (this.serialNumber16MSB << 16) | channelId.deviceNumber;
        else
            this.serialNumber = this.serialNumber16MSB;


    };

    // Background page 3
    GenericPage.prototype.readProductId = function (data)
    {
        this.hardwareVersion = data[1];
        this.softwareVersion = data[2];
        this.modelNumber = data[3];
    };

    // Parsing of common pages
    GenericPage.prototype.parse = function (broadcast) {

        var data;

        if (!broadcast) {
            this.log.log('error', 'Undefined broadcast received');
            return;
        } else

            this.broadcast = broadcast;

        data = broadcast.data;

        if (!data) {
            this.log.log('error', 'Received undefined data in broadcast');
            return;
        }

        var dataView = new DataView(data.buffer);

        // Byte 0 

        this.number = data[0];

        // Byte 1 - reserved
        // 0xFF

        // Byte 2 - reserved
        // 0xFF

        switch (this.number) {

            case GenericPage.prototype.COMMON.PAGE80: // 80 Common data page - Manufactorer's identification

                this.type = GenericPage.prototype.TYPE.BACKGROUND;

                // Byte 0
                this.number = data[0];

                // Byte 3  - HW revision - set by manufaturer
                this.HWRevision = data[3];

                // Byte 4 LSB - 5 MSB - little endian
                this.manufacturerID = dataView.getUint16(data.byteOffset + 4, true);

                // Byte 6 LSB - 7 MSB - little endian
                this.modelNumber = dataView.getUint16(data.byteOffset + 6, true);


                break;

            case GenericPage.prototype.COMMON.PAGE81: // 81 Common data page - Product information 

                this.type = GenericPage.prototype.TYPE.BACKGROUND;

                // Byte 3 Software revision - set by manufacturer
                this.SWRevision = data[3];

                // Byte 4 LSB - 7 MSB Serial Number - little endian
                this.serialNumber = dataView.getUint32(data.byteOffset + 4, true);

                break;

            case GenericPage.prototype.COMMON.PAGE82: // 82 Common data page - Battery Status

                this.type = GenericPage.prototype.TYPE.BACKGROUND;

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

                this.cumulativeOperatingTime = (dataView.getUint32(data.byteOffset + 3, true) & 0x00FFFFFF) * unit_multiplier; // 24 - bit only
                this.cumulativeOperatingTimeString = this.toStringCumulativeOperatingTime(this.cumulativeOperatingTime);

                this.lastBatteryReset = (new Date(Date.now() - this.cumulativeOperatingTime * 1000)).toLocaleString();

                // Byte 6

                this.fractionalBatteryVoltage = data[6] / 256; // Volt
                if (this.descriptive.coarseVoltage === 0x0F)
                    this.batteryVoltage = "Invalid";
                else
                    this.batteryVoltage = this.fractionalBatteryVoltage + this.descriptive.coarseVoltage;

                break;

            default:

                this.log.log('error', 'Unable to parse page number ', this.number + ' 0x' + this.number.toString(16), data);
                return -1;

                //break;

        }

    };

    GenericPage.prototype.toStringCumulativeOperatingTime = function (cumulativeOperatingTime) {

        if (cumulativeOperatingTime < 3600)
            return cumulativeOperatingTime.toFixed(1) + 's ';
        else
            return (this.cumulativeOperatingTime / 3600).toFixed(1) + ' h';

    };

    GenericPage.prototype._batteryVoltageToString = function (voltage) {

        if (typeof voltage === "number")
            return voltage.toFixed(1);
        else
            return "" + voltage;
    };


    GenericPage.prototype.toString = function () {
        var msg;

        switch (this.number) {

            case GenericPage.prototype.COMMON.PAGE80:

                msg = this.type + " P# " + this.number + " Manufacturer " + this.manufacturerID + " HW revision " + this.HWRevision + " Model nr. " + this.modelNumber;

                break;

            case GenericPage.prototype.COMMON.PAGE81:

                msg = this.type + " P# " + this.number + " SW revision " + this.SWRevision;

                if (this.serialNumber === GenericPage.prototype.NO_SERIAL_NUMBER)
                    msg += " No serial number";
                else
                    msg += " Serial number " + this.serialNumber;

                break;

            case GenericPage.prototype.COMMON.PAGE82:


                msg = this.type + " P# " + this.number + " Cumulative operating time ";

                msg += this.cumulativeOperatingTimeString + ' Battery reset ca. ' + this.lastBatteryReset;

                if (this.descriptive.coarseVoltage !== 0x0F) // Filter invalid voltage
                    msg += " Battery (V) " + this._batteryVoltageToString(this.batteryVoltage);

                msg += " Battery status " + this.batteryStatusString;

                break;


            default:
                this.log.log('error', 'Unable to construct string for page number', this.number);

                break;
        }

        return msg;

    };

    GenericPage.prototype.TYPE = {
        MAIN: "main",
        BACKGROUND: "background"
    };

    GenericPage.prototype.clone = function () {
        var clone = Object.create(null),
            ownEnumerableProperties = Object.keys(this),
            property;

        for (var index in ownEnumerableProperties) {
            property = ownEnumerableProperties[index];

            switch (property) {
                case 'broadcast': // return the most essential information for the ui

                    clone.broadcast = {

                        channelId: this.broadcast.channelId

                    };


                    break;

                case 'log': // ignore
                case 'previousPage':

                    break;

                default:

                    clone[property] = this[property];

                    break;

            }

        }

        return clone;

    };

    return GenericPage;

});
