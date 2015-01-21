/* global define: true, Uint8Array: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
    
    var ANTMessage = require('messages/ANTMessage');
    
    function OpenChannelMessage(channel) {
    
        var msgBuffer = new Uint8Array([channel]);
      
        ANTMessage.call(this);
    
        this.id = ANTMessage.prototype.MESSAGE.OPEN_CHANNEL;
        this.name = "Open channel";
        this.type = ANTMessage.prototype.TYPE.REQUEST;
        this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)
    
    
        this.channel = channel;
    
        this.setContent(msgBuffer.buffer);
    
        //console.log("OpenChannelMessage", this);
    }
    
    OpenChannelMessage.prototype = Object.create(ANTMessage.prototype);
    
    OpenChannelMessage.prototype.constructor = OpenChannelMessage;
    
    OpenChannelMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16);
    };
    
    module.exports = OpenChannelMessage;
        return module.exports;
});
