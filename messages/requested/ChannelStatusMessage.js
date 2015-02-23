/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('../Message'),
        Channel = require('../../channel/channel');

    function ChannelStatusMessage(data){

        Message.call(this,data);

    }

    ChannelStatusMessage.prototype = Object.create(Message.prototype);

    ChannelStatusMessage.prototype.constructor = ChannelStatusMessage;

    ChannelStatusMessage.prototype.STATE = {
        UN_ASSIGNED: 0x00,
        ASSIGNED: 0x01,
        SEARCHING: 0x02,
        TRACKING: 0x03
    };

    ChannelStatusMessage.prototype.decode = function (data){
        var status = this.content[1];

        this.channelNumber = this.content[0];

        this.channelStatus = {
            value: status,
            state: status & parseInt("00000011", 2), // Lower 2 bits
            networkNumber: (status & parseInt("00001100", 2)) >> 2,
            channelType: (status & parseInt("11110000", 2)) >> 4
        };

        // Tip from http://www.i-programmer.info/programming/javascript/2550-javascript-bit-manipulation.html

        switch (this.channelStatus.state){
            case ChannelStatusMessage.prototype.STATE.UN_ASSIGNED : this.channelStatus.stateMessage = "UN-ASSIGNED"; break;
            case ChannelStatusMessage.prototype.STATE.ASSIGNED: this.channelStatus.stateMessage = "ASSIGNED"; break;
            case ChannelStatusMessage.prototype.STATE.SEARCHING: this.channelStatus.stateMessage = "SEARCHING"; break;
            case ChannelStatusMessage.prototype.STATE.TRACKING: this.channelStatus.stateMessage = "TRACKING"; break;
            default: throw new Error('Unknown state for channel ' + this.channelStatus.state);
        }

    };

    ChannelStatusMessage.prototype.toString = function (){
        return Message.prototype.toString.call(this) + " C# " + this.channelNumber + " N# " + this.channelStatus.networkNumber + " " + Channel.prototype.TYPE[this.channelStatus.channelType] + " " +
            this.channelStatus.stateMessage;
    };

    module.exports = ChannelStatusMessage;
    return module.exports;
});
