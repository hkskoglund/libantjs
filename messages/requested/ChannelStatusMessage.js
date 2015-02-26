/* global define: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function (require, exports, module){

    'use strict';

    var Message = require('../Message'),
        Channel = require('../../channel/channel'),
        ChannelState = require('../../channel/channelState'),
        ChannelType = require('../../channel/channelType'),
        Network = require('../../channel/network');

    function ChannelStatusMessage(data)    {

        Message.call(this,data);

    }

    ChannelStatusMessage.prototype = Object.create(Message.prototype);

    ChannelStatusMessage.prototype.constructor = ChannelStatusMessage;

    ChannelStatusMessage.prototype.decode = function (data)    {
        var status = this.content[1];

        this.channel = this.content[0];

        this.state = new ChannelState(status & parseInt("00000011", 2)); // Lower 2 bits

        this.network = new Network((status & parseInt("00001100", 2)) >> 2);

        this.type = new ChannelType((status & parseInt("11110000", 2)) >> 4);

        // Tip from http://www.i-programmer.info/programming/javascript/2550-javascript-bit-manipulation.html

    };

    ChannelStatusMessage.prototype.toString = function ()    {
        return Message.prototype.toString.call(this) + " Ch " + this.channel + ' '+ this.network.toString() + " " + this.type.toString() + " " +
        this.state.toString();
    };

    module.exports = ChannelStatusMessage;
    return module.exports;
});
