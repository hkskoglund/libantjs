/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    'use strict';

    var Message = require('./Message');

    function ResetSystemMessage() {

        Message.call(this,undefined,Message.prototype.MESSAGE.RESET_SYSTEM);

        this.setContent((new Uint8Array(1)).buffer);

    }

    ResetSystemMessage.prototype = Object.create(Message.prototype);

    ResetSystemMessage.prototype.constructor = ResetSystemMessage;

    module.exports = ResetSystemMessage;
    return module.exports;
});
