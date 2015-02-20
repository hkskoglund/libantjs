/* global define: true, Uint8Array: true */

if (typeof define !== 'function')
{ var define = require('amdefine')(module); }

define(function (require, exports, module)
{
  

    'use strict';

    var Message = require('./Message');

    function ResetSystemMessage()
{

        Message.call(this,undefined,Message.prototype.MESSAGE.RESET_SYSTEM);

        this.encode();
    }

    ResetSystemMessage.prototype = Object.create(Message.prototype);

    ResetSystemMessage.prototype.constructor = ResetSystemMessage;

    ResetSystemMessage.prototype.encode = function ()
    {
      this.setContent((new Uint8Array(1)).buffer);
    };

    module.exports = ResetSystemMessage;
    return module.exports;
});
