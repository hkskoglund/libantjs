/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
    var ANTMessage = require('messages/ANTMessage'),
        LibConfig = require('messages/libConfig'),
        ChannelId = require('messages/channelId'),
        RSSI = require('messages/rssi'),
        RXTimestamp = require('messages/RXTimestamp');
    
    function BroadcastDataMessage(data) {
        
        ANTMessage.call(this,data);
    
        this.name = "Broadcast Data";
        this.id = ANTMessage.prototype.MESSAGE.BROADCAST_DATA;
    
    //    // Pre-create properties extended broadcast for fast access
    //    this.channelId = new ChannelId();
    //    this.RSSI = new RSSI();
    //    this.RXTimestamp = new RXTimestamp();
        
        if (data)
            this.parse();
    }
    
    BroadcastDataMessage.prototype = Object.create(ANTMessage.prototype);
    
    BroadcastDataMessage.prototype.constructor = BroadcastDataMessage;
    
    // Spec. p. 91
    BroadcastDataMessage.prototype.parse = function () {
        var sharedAddress,
            dataView;
    
        this.channel = this.content[0];
        this.data = this.content.subarray(1, 9); // Data 0 .. 7 - assume independent channel
    
        // 'RX' <Buffer a4 14 4e 01 04 00 f0 59 a3 5f c3 2b e0 af 41 78 01 10 00 69 00 ce f6 70>
        // 'Broadcast Data ID 0x4e C# 1 ext. true Flag 0xe0' <Buffer 04 00 f0 59 a3 5f c3 2b>
        //this.extendedDataMessage = () ? true : false;
        if (this.content.length > 9) {
            this.flagsByte = this.content[9];
            this.extendedData = new Uint8Array(this.content.buffer.slice(10));
    
            // Check for channel ID
            // p.37 spec: relative order of extended messages; channel ID, RSSI, timestamp (based on 32kHz clock, rolls over each 2 seconds)
            if (this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) {
                this.channelId = new ChannelId();
                this.channelId.parse(this.extendedData.buffer.slice(0, 4));
    
                // Spec. p. 27 - single master controls multiple slaves - possible to have a 1 or 2-byte shared address field at the start of data payload
    //            sharedAddress = this.channelId.getSharedAddressType();
    //
    //            if (sharedAddress === ChannelId.prototype.SHARED_ADDRESS_TYPE.ADDRESS_1BYTE) {
    //                this.sharedAddress = this.content[0]; // 1 byte is the shared address 0 = broadcast to all slaves
    //                this.data = this.content.subarray(2, 9);
    //
    //            } else if (sharedAddress === ChannelId.prototype.SHARED_ADDRESS_TYPE.ADDRESS_2BYTE) {
    //                this.sharedAddress = (new DataView(this.content,0,2)).getUint16(0,true); // 2-bytes LSB MSB shared address 0 = broadcast to all slaves
    //                this.data = this.content.subarray(3, 9);
    //            }
            }
    
            if (this.flagsByte & LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED) 
            {
                this.RXTimestamp = new RXTimestamp();
                this.RXTimestamp.parse(this.extendedData.buffer.slice(-2));
            }
            
            if (!(this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) && (this.flagsByte & LibConfig.prototype.Flag.RSSI_ENABLED)) {
                this.RSSI.parse(this.extendedData.buffer.slice(0, 2));
            }
    
            if ((this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) && (this.flagsByte & LibConfig.prototype.Flag.RSSI_ENABLED)) {
                this.RSSI.parse(this.extendedData.buffer.slice(4, 7));
            }
        }
    
    };
    
    
    BroadcastDataMessage.prototype.toString = function () {
        var msg = this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel;
        
        if (this.extendedData) {
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

