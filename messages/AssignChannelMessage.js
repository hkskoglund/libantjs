/* global define: true, Uint8Array */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

  'use strict';

  var Message = require('./Message'),
      Channel = require('../channel');

  function AssignChannelMessage(channel,channelType,networkNumber,extendedAssignment) {

      var msgBuffer;

      if (extendedAssignment)
          msgBuffer = new Uint8Array([channel,channelType,networkNumber,extendedAssignment]);
      else
          msgBuffer = new Uint8Array([channel, channelType, networkNumber]);

      Message.call(this,undefined,Message.prototype.MESSAGE.ASSIGN_CHANNEL);

      this.channel = channel;
      this.channelType = channelType;
      this.networkNumber = networkNumber;
      if (extendedAssignment)
        this.extendedAssignment = extendedAssignment;

      this.setContent(msgBuffer.buffer);

  }

  AssignChannelMessage.prototype = Object.create(Message.prototype);

  AssignChannelMessage.prototype.constructor = AssignChannelMessage;

  AssignChannelMessage.prototype.toString = function () {
      var msg = Message.prototype.toString() + " C# " + this.channel + " N# " + this.networkNumber + " " + Channel.prototype.TYPE[this.channelType];
      if (this.extendedAssignment)
          msg += " extended assignment " + this.extendedAssignment;
      return msg;
  };

  module.exports = AssignChannelMessage;
  return module.exports;
});
