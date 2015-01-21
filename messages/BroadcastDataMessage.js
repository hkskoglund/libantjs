/* global define: true, Uint8Array: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
    var ANTMessage = require('messages/ANTMessage');
   
    function BroadcastDataMessage(data) {
        
        ANTMessage.call(this,data);
    
        this.name = "Broadcast Data";
        this.id = ANTMessage.prototype.MESSAGE.BROADCAST_DATA;
      
        if (data)
            this.parse();
    }
    
    BroadcastDataMessage.prototype = Object.create(ANTMessage.prototype);
    
    BroadcastDataMessage.prototype.constructor = BroadcastDataMessage;
    
    // Spec. p. 91
    BroadcastDataMessage.prototype.parse = function (data) {
        var sharedAddress,
            dataView;
    
        if (data)
            this.mainParse(data); // in ANTMessage

        this.channel = this.content[0];
        //this.data = new Uint8Array(this.content.buffer.slice(1, 9)); // Data 0 .. 7 - assume independent channel
        this.data = this.content.subarray(1,9);
        // 'RX' <Buffer a4 14 4e 01 04 00 f0 59 a3 5f c3 2b e0 af 41 78 01 10 00 69 00 ce f6 70>
        // 'Broadcast Data ID 0x4e C# 1 ext. true Flag 0xe0' <Buffer 04 00 f0 59 a3 5f c3 2b>
        //this.extendedDataMessage = () ? true : false;
        
    
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
