/* global define: true, Uint8Array: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
    var ANTMessage = require('messages/ANTMessage');
    
    
    function SetChannelRFFreqMessage(channel, RFFreq) {
    
        var msgBuffer = new Uint8Array(2);
    
        msgBuffer[0] = channel;
        msgBuffer[1] = RFFreq || 66;
    
        ANTMessage.call(this);
    
        this.id = ANTMessage.prototype.MESSAGE.SET_CHANNEL_RFFREQ;
        this.name = "Set channel RF frequency";
        this.type = ANTMessage.prototype.TYPE.REQUEST;
        this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)
    
        this.channel = channel;
        this.RFFreq = RFFreq;
    
        this.setContent(msgBuffer.buffer);
    
        //console.log("SetChannelRFFreqMessage", this);
    }
    
    SetChannelRFFreqMessage.prototype = Object.create(ANTMessage.prototype);
    
    SetChannelRFFreqMessage.prototype.constructor = SetChannelRFFreqMessage;
    
    
    SetChannelRFFreqMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel + " RF freq. " + this.RFFreq;
    };
    
    module.exports = SetChannelRFFreqMessage;
        return module.exports;
});
