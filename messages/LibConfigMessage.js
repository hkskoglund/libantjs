/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    "use strict";

    var Message = require('./Message');

    function LibConfigMessage(libConfig) {

        var msgBuffer = new Uint8Array(2);

        msgBuffer[0] = Message.prototype.FILLER_BYTE; // Filler
        msgBuffer[1] = libConfig;

        Message.call(this);

        this.id = Message.prototype.MESSAGE.LIBCONFIG;

        this.libConfig = libConfig;

        this.setContent(msgBuffer.buffer);

    }

    LibConfigMessage.prototype = Object.create(Message.prototype);

    LibConfigMessage.prototype.constructor = LibConfigMessage;


    LibConfigMessage.prototype.toString = function () {
        return this.name + " ID 0x" + this.id.toString(16) + " lib config " + this.libConfig;
    };

    module.exports = LibConfigMessage;
        return module.exports;
});
