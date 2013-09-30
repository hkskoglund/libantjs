/* global define: true, Uint8Array: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
    var ANTMessage = require('messages/ANTMessage');
    
    
    function SetChannelSearchTimeoutMessage(channel, searchTimeout) {
    
        var msgBuffer = new Uint8Array(2);
    
        msgBuffer[0] = channel;
        msgBuffer[1] = searchTimeout;
    
        ANTMessage.call(this);
    
        this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_SEARCH_TIMEOUT;
        this.name = "Set channel search timeout";
        this.type = ANTMessage.prototype.TYPE.REQUEST;
        this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)
    
        this.channel = channel;
        this.HPsearchTimeout = searchTimeout;
    
        this.setContent(msgBuffer.buffer);
    
        //console.log("SetChannelSearchTimeoutMessage", this);
    }
    
    SetChannelSearchTimeoutMessage.prototype = Object.create(ANTMessage.prototype);
    
    SetChannelSearchTimeoutMessage.prototype.constructor = SetChannelSearchTimeoutMessage;
    
    SetChannelSearchTimeoutMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16)+ "C# "+this.channel+" HP search timeout" +this.HPsearchTimeout;
    };
    
    module.exports = SetChannelSearchTimeoutMessage;
    
    return module.exports;
});