/* global define: true, Uint8Array */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('../Message');

    function SetNetworkKeyMessage(channel, key){

        Message.call(this,undefined,Message.prototype.SET_NETWORK_KEY);
        this.encode(channel,key);

    }

    SetNetworkKeyMessage.prototype = Object.create(Message.prototype);

    SetNetworkKeyMessage.prototype.constructor = SetNetworkKeyMessage;

    SetNetworkKeyMessage.prototype.encode = function (channel, key){
      var msgBuffer = new Uint8Array(9);

      msgBuffer[0] = channel;
      msgBuffer.set(key,1);

      this.channel = channel;
      this.key = key;

      this.setPayload(msgBuffer.buffer);

    };

    SetNetworkKeyMessage.prototype.toString = function (){
        return Message.prototype.toString.call(this) + " Ch " + this.channel + " key " + this.key;
    };

    module.exports = SetNetworkKeyMessage;
    return module.exports;
});
