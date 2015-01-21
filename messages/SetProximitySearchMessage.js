/* global define: true, Uint8Array: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
    var ANTMessage = require('messages/ANTMessage');
    
    
    function SetProximitySearchMessage(channel, searchThreshold) {
    
        var msgBuffer = new Uint8Array(2);
            
        msgBuffer[0] = channel;
        msgBuffer[1] = searchThreshold; // 0 - disabled, 1:10 - closes to farthest
     
    
        ANTMessage.call(this);
    
        this.id = ANTMessage.prototype.MESSAGE.SET_PROXIMITY_SEARCH;
        this.name = "Set proximity search";
        this.type = ANTMessage.prototype.TYPE.REQUEST;
        this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)
    
        this.channel = channel;
        this.searchThreshold = searchThreshold;
    
        this.setContent(msgBuffer.buffer);
    
        //console.log("SetProximitySearchMessage", this);
    }
    
    SetProximitySearchMessage.prototype = Object.create(ANTMessage.prototype);
    
    SetProximitySearchMessage.prototype.constructor = SetProximitySearchMessage;
    
    SetProximitySearchMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " search threshold " + this.searchThreshold;
    };
    
    module.exports = SetProximitySearchMessage;
    return module.exports;
});
