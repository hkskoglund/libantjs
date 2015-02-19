/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    'use strict';

    var Message = require('./Message'),
        HighPrioritySearchTimeout = require('./HighPrioritySearchTimeout');

    function SetChannelSearchTimeoutMessage(channel, searchTimeout) {

       // Hmm, searchTimeout is type HighPrioritySearchTimeout, but not instanceof HighPrioritySearchTimeout
       // Maybe due to function required local in this module is not the same as the function required somewhere else
        //console.log("searchTimeout",searchTimeout instanceof HighPrioritySearchTimeout);

        var msgBuffer = new Uint8Array(2);

        msgBuffer[0] = channel;
        if (typeof searchTimeout !== 'number')
          msgBuffer[1] = searchTimeout.getRawValue();
        else
            msgBuffer[1] = searchTimeout;

        Message.call(this,undefined,Message.prototype.MESSAGE.SET_CHANNEL_SEARCH_TIMEOUT);

        this.channel = channel;
        this.HPsearchTimeout = searchTimeout;

        this.setContent(msgBuffer.buffer);

    }

    SetChannelSearchTimeoutMessage.prototype = Object.create(Message.prototype);

    SetChannelSearchTimeoutMessage.prototype.constructor = SetChannelSearchTimeoutMessage;

    SetChannelSearchTimeoutMessage.prototype.toString = function () {
        return Message.prototype.toString()+ "C# "+this.channel+" HP search timeout" +this.HPsearchTimeout;
    };

    module.exports = SetChannelSearchTimeoutMessage;
    return module.exports;
});
