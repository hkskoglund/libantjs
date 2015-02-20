/* global define: true, DataView: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

      'use strict';

  var Message = require('./Message'),
      //Channel = require('../../channel.js');
      ChannelId = require('./channelId');

  function ChannelIdMessage() {

      Message.call(this,undefined,Message.prototype.MESSAGE.CHANNEL_ID);

  }

  ChannelIdMessage.prototype = Object.create(Message.prototype);

  ChannelIdMessage.prototype.constructor = ChannelIdMessage;

  //ChannelIdMessage.prototype.STATE = {
  //    UN_ASSIGNED: 0x00,
  //    ASSIGNED: 0x01,
  //    SEARCHING: 0x02,
  //    TRACKING: 0x03
  //}

  ChannelIdMessage.prototype.decode = function (data) {

      this.channelNumber = this.content[0];
      this.channelId = new ChannelId(new DataView(this.content).getUint16(1,true), this.content[3], this.content[4]);

      //var status;

      //this.channelNumber = this.content[0];

      //status = this.content[1];
      //this.channelStatus = {
      //    value: status,
      //    state: status & parseInt("00000011", 2), // Lower 2 bits
      //    networkNumber: (status & parseInt("00001100", 2)) >> 2,
      //    channelType: (status & parseInt("11110000", 2)) >> 4
      //};

      //// Tip from http://www.i-programmer.info/programming/javascript/2550-javascript-bit-manipulation.html

      //switch (this.channelStatus.state) {
      //    case ChannelIdMessage.prototype.STATE.UN_ASSIGNED: this.channelStatus.stateMessage = "UN-ASSIGNED"; break;
      //    case ChannelIdMessage.prototype.STATE.ASSIGNED: this.channelStatus.stateMessage = "ASSIGNED"; break;
      //    case ChannelIdMessage.prototype.STATE.SEARCHING: this.channelStatus.stateMessage = "SEARCHING"; break;
      //    case ChannelIdMessage.prototype.STATE.TRACKING: this.channelStatus.stateMessage = "TRACKING"; break;
      //    default: throw new Error('Unknown state for channel ' + this.channelStatus.state); break;
      //}

      ////console.log("Channel status", this.channelNumber, this.channelStatus);

      ////this.message = { 'text': this.channelStatus.stateMessage };

      ////return this.message;

  };

  ChannelIdMessage.prototype.toString = function () {
      return Message.prototype.toString.call(this)+ " C# " + this.channelNumber + " " + this.channelId.toString();
  };

  module.exports = ChannelIdMessage;
      return module.exports;
});
