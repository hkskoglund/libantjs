/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    'use strict';

    var Message = require('./Message');

    function UnAssignChannelMessage(channel) {

        var msgBuffer = new Uint8Array([channel]);


        Message.call(this,undefined,Message.prototype.MESSAGE.UNASSIGN_CHANNEL);

        // Parameters

        this.channel = channel;

        this.setContent(msgBuffer.buffer);

    }

    UnAssignChannelMessage.prototype = Object.create(Message.prototype);

    UnAssignChannelMessage.prototype.constructor = UnAssignChannelMessage;

    UnAssignChannelMessage.prototype.toString = function () {
        return Message.prototype.toString() + " C# " + this.channel;
    };

    module.exports = UnAssignChannelMessage;
        return module.exports;
});
