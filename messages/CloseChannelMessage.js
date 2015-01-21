/* global define: true, Uint8Array: true */

define(function (require, exports, module) {
    'use strict';
    
    var ANTMessage = require('messages/ANTMessage');
    
    function CloseChannelMessage(channel) {
    
        var msgBuffer = new Uint8Array([channel]);
    
        ANTMessage.call(this);
    
        this.id = ANTMessage.prototype.MESSAGE.CLOSE_CHANNEL;
        this.name = "Close channel";
        
        this.type = ANTMessage.prototype.TYPE.REQUEST;
        this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)
    
        this.setContent(msgBuffer.buffer);
    
        //console.log("CloseChannelMessage", this);
    }
    
    CloseChannelMessage.prototype = Object.create(ANTMessage.prototype);
    
    CloseChannelMessage.prototype.constructor = CloseChannelMessage;
    
    CloseChannelMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16);
    };

    module.exports = CloseChannelMessage;
    return module.exports;
});
