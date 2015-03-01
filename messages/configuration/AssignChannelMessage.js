/* global define: true, Uint8Array */

if (typeof define !== 'function')
{ var define = require('amdefine')(module); }

define(function (require, exports, module)
{

  'use strict';

  var Message = require('../Message'),
      Channel = require('../../channel/channel');

  function AssignChannelMessage(channel,channelType,networkNumber,extendedAssignment)
{

    Message.call(this,undefined,Message.prototype.ASSIGN_CHANNEL);
    this.encode(channel,channelType,networkNumber,extendedAssignment);
  }

  AssignChannelMessage.prototype = Object.create(Message.prototype);

  AssignChannelMessage.prototype.constructor = AssignChannelMessage;

  AssignChannelMessage.prototype.encode = function (channel,channelType,networkNumber,extendedAssignment)
  {
    var msgBuffer;

    if (extendedAssignment)
        msgBuffer = new Uint8Array([channel,channelType,networkNumber,extendedAssignment]);
    else
        msgBuffer = new Uint8Array([channel, channelType, networkNumber]);

    this.channel = channel;
    this.type = channelType;
    this.net = networkNumber;

    if (extendedAssignment)
      this.extendedAssignment = extendedAssignment;

    this.setPayload(msgBuffer.buffer);
  };

  AssignChannelMessage.prototype.toString = function ()
{
      var msg = Message.prototype.toString.call(this) + " Ch " + this.channel + " Net " + this.net + " " + Channel.prototype.TYPE[this.type];

      if (this.extendedAssignment)
          msg += " extended assignment " + Channel.prototype.getExtendedAssignment.call(this);

      return msg;
  };

  module.exports = AssignChannelMessage;
  return module.exports;
});
