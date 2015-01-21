/* global define: true, Uint8Array */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
    var ANTMessage = require('messages/ANTMessage');
    
    
    function SetNetworkKeyMessage(channel, key) {
    
        if (key.length !== 8)
            throw new TypeError("Key does not have length of 8 bytes");
    
        var msgBuffer = new Uint8Array(9);
    
    //    // Be flexible, try to create a buffer if an array is used
    //    if (Buffer.isBuffer(key))
    //      msgBuffer = Buffer.concat([new Buffer([channel]), key]);
    //    else
    //        msgBuffer = Buffer.concat([new Buffer([channel]), new Buffer(key)]);
    
        msgBuffer[0] = channel;
        msgBuffer.set(key,1);
        
        ANTMessage.call(this);
    
        this.id = ANTMessage.prototype.MESSAGE.SET_NETWORK_KEY;
        this.name = "Set network key";
        this.type = ANTMessage.prototype.TYPE.REQUEST;
        this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)
    
        this.channel = channel;
        this.key = key;
    
        this.setContent(msgBuffer.buffer);
    
        //console.log("SetNetworkKeyMessage", this);
    }
    
    SetNetworkKeyMessage.prototype = Object.create(ANTMessage.prototype);
    
    SetNetworkKeyMessage.prototype.constructor = SetNetworkKeyMessage;
    
    
    SetNetworkKeyMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " key " + this.key;
    };
    
    module.exports = SetNetworkKeyMessage;
        return module.exports;
});
