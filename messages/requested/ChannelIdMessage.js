/* global define: true, DataView: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function (require, exports, module){

      'use strict';

  var Message = require('../Message'),
      ChannelId = require('./channelId');

  function ChannelIdMessage()  {

      Message.call(this,undefined,Message.prototype.CHANNEL_ID);

  }

  ChannelIdMessage.prototype = Object.create(Message.prototype);

  ChannelIdMessage.prototype.constructor = ChannelIdMessage;


  ChannelIdMessage.prototype.decode = function (data)  {

      this.channel = this.content[0];
      this.channelId = new ChannelId(new DataView(this.content).getUint16(1,true), this.content[3], this.content[4]);

  };

  ChannelIdMessage.prototype.toString = function ()  {
      return Message.prototype.toString.call(this)+ " Ch " + this.channel + " " + this.channelId.toString();
  };

    module.exports = ChannelIdMessage;
    return module.exports;
});
