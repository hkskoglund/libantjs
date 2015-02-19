/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
  
    'use strict';

    var Message = require('./Message');

    function CloseChannelMessage(channel) {

        var msgBuffer = new Uint8Array([channel]);

        Message.call(this);

        this.id = Message.prototype.MESSAGE.CLOSE_CHANNEL;

        this.setContent(msgBuffer.buffer);
}

    CloseChannelMessage.prototype = Object.create(Message.prototype);

    CloseChannelMessage.prototype.constructor = CloseChannelMessage;

    CloseChannelMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16);
    };

    module.exports = CloseChannelMessage;
    return module.exports;
});
