/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    "use strict";

    var Message = require('./Message');

    function OpenChannelMessage(channel) {

        var msgBuffer = new Uint8Array([channel]);

        Message.call(this);

        this.id = Message.prototype.MESSAGE.OPEN_CHANNEL;

        this.channel = channel;

        this.setContent(msgBuffer.buffer);

    }

    OpenChannelMessage.prototype = Object.create(Message.prototype);

    OpenChannelMessage.prototype.constructor = OpenChannelMessage;

    OpenChannelMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16);
    };

    module.exports = OpenChannelMessage;
    return module.exports;
});
