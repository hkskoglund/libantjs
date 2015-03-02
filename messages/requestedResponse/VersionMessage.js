/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('../Message');

    function VersionMessage(data)    {

        Message.call(this,data);

    }

    VersionMessage.prototype = Object.create(Message.prototype);

    VersionMessage.prototype.constructor = VersionMessage;

    VersionMessage.prototype.decode = function (data)    {
       var version = this.payload.subarray(0,-1),
           versionStr = String.fromCharCode(this.channel); // Content is a 11 - bytes null terminated string - strip off the null

        for (var i=0; i < version.length; i++)
                versionStr += String.fromCharCode(version[i]);

        this.version = versionStr;

    };

    VersionMessage.prototype.getVersion = function ()
    {
      return this.version;
    };

    VersionMessage.prototype.toString = function ()    {
        return Message.prototype.toString.call(this) + ' '+this.version;
    };

    module.exports = VersionMessage;
     return module.exports;
});
