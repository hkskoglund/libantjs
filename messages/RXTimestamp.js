/* global define: true, DataView: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
    // Function names based on Dynastram Android SDK v 4.00 documentation
    function RXTimestamp(rxTimestamp) {
        this.timestamp = rxTimestamp;
    }
    
    RXTimestamp.prototype.parse = function (timestamp) {
       
        this.timestamp = (new DataView(timestamp.buffer)).getUint16(0+timestamp.byteOffset,true);
        
    };
    
    RXTimestamp.prototype.getRxTimestamp = function () {
        return this.timestamp;
    };
    
    RXTimestamp.prototype.convertRXTimestampToSeconds = function (timestamp) {
        if (timestamp)
            return timestamp / 32768;
        else
          return (this.timestamp / 32768);
    };
    
    RXTimestamp.prototype.toString = function () {
        return "RX Timestamp " + this.getRxTimestamp()+ " " + this.convertRXTimestampToSeconds().toFixed(3)+" s";
    };
    
    module.exports = RXTimestamp;
        return module.exports;
});
