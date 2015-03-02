/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module)
{
    'use strict';

    var Message = require('../Message');

    function BroadcastDataMessage(data)
    {
        Message.call(this,data,Message.prototype.BROADCAST_DATA);
    }

    BroadcastDataMessage.prototype = Object.create(Message.prototype);
    BroadcastDataMessage.prototype.constructor = BroadcastDataMessage;

    // Spec. p. 91
    BroadcastDataMessage.prototype.decode = function (data)
    {
        var sharedAddress,
            dataView;

        this.channel = this.payload[0];

        // 'RX' <Buffer a4 14 4e 01 04 00 f0 59 a3 5f c3 2b e0 af 41 78 01 10 00 69 00 ce f6 70>
        // 'Broadcast Data ID 0x4e Ch 1 ext. true Flag 0xe0' <Buffer 04 00 f0 59 a3 5f c3 2b>

    };


    BroadcastDataMessage.prototype.toString = function ()
    {
        var msg = Message.prototype.toString.call(this) + " Ch " + this.channel;

        if (this.extendedData)
        {
            msg += " Flags 0x" + this.flagsByte.toString(16);

            if (this.channelId)
              msg += " "+ this.channelId.toString();

            if (this.RSSI)
                msg += " "+ this.RSSI.toString();

            if (this.RXTimestamp)
                msg += " "+this.RXTimestamp.toString();
        }

        return msg;
    };

    module.exports = BroadcastDataMessage;
    return module.exports;
});
