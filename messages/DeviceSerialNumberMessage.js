/* global define: true, DataView: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
    var  ANTMessage = require('messages/ANTMessage');
    
    function DeviceSerialNumberMessage(data) {
    
        //if (typeof data !== "undefined") {
        //    ANTMessage.call(this, data);
        //    this.parse();
        //} else 
            ANTMessage.call(this,data);
    
        this.id = ANTMessage.prototype.MESSAGE.DEVICE_SERIAL_NUMBER;
        this.name = "Device Serial Number";
        this.type = ANTMessage.prototype.TYPE.RESPONSE;
        this.requestId = ANTMessage.prototype.MESSAGE.REQUEST;
        
        if (data)
            this.parse();
    }
    
    DeviceSerialNumberMessage.prototype = Object.create(ANTMessage.prototype);
    
    DeviceSerialNumberMessage.prototype.constructor = DeviceSerialNumberMessage;
    
    DeviceSerialNumberMessage.prototype.parse = function () {
        // SN 4 bytes Little Endian
        var dw = new DataView(this.content.buffer);
        
        this.serialNumber = dw.getUint32(0,true);
        this.serialNumberAsChannelId = dw.getUint16(0,true); // Lower 2-bytes
    };
    
    DeviceSerialNumberMessage.prototype.toString = function () {
        return this.name +  " " + this.serialNumber+" lower 2-bytes "+this.serialNumberAsChannelId;
    };
    
    module.exports = DeviceSerialNumberMessage;
        return module.exports;
});
