/* global define: true, Uint8Array: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
    var ANTMessage = require('messages/ANTMessage');
    
    function LibConfigMessage(libConfig) {
    
        var msgBuffer = new Uint8Array(2);
            
        msgBuffer[0] = ANTMessage.prototype.FILLER_BYTE; // Filler
        msgBuffer[1] = libConfig; 
    
        ANTMessage.call(this);
    
        this.id = ANTMessage.prototype.MESSAGE.LIBCONFIG;
        this.name = "Lib Config";
        this.type = ANTMessage.prototype.TYPE.REQUEST;
        this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)
        
        this.libConfig = libConfig;
    
        this.setContent(msgBuffer.buffer);
    
        //console.log("LibConfigMessage", this);
    }
    
    LibConfigMessage.prototype = Object.create(ANTMessage.prototype);
    
    LibConfigMessage.prototype.constructor = LibConfigMessage;
    
    
    LibConfigMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16) + " lib config " + this.libConfig;
    };
    
    module.exports = LibConfigMessage;
        return module.exports;
});
