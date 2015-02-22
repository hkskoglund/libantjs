/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('./Message');

    function EventBufferConfigurationMessage(data)    {

        Message.call(this,data);

    }

    EventBufferConfigurationMessage.prototype = Object.create(Message.prototype);

    EventBufferConfigurationMessage.prototype.constructor = EventBufferConfigurationMessage;

    EventBufferConfigurationMessage.prototype.decode = function (data)    {

    };

    EventBufferConfigurationMessage.prototype.toString = function (){
        return Message.prototype.toString.call(this);
    };

    module.exports = EventBufferConfigurationMessage;
    return module.exports;
});
