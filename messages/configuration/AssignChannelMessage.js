/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */


  /*jshint -W097 */
'use strict';

  var Message = require('../Message'),
    Channel = require('../../channel/channel');

  function AssignChannelMessage(channel, channelType, networkNumber, extendedAssignment) {

    Message.call(this, undefined, Message.prototype.ASSIGN_CHANNEL);
    this.encode(channel, channelType, networkNumber, extendedAssignment);
  }

  AssignChannelMessage.prototype = Object.create(Message.prototype);

  AssignChannelMessage.prototype.constructor = AssignChannelMessage;

  AssignChannelMessage.prototype.encode = function(channel, channelType, networkNumber, extendedAssignment) {
    var content;

    if (extendedAssignment)
      content = new Uint8Array([channel, channelType, networkNumber, extendedAssignment]);
    else
      content = new Uint8Array([channel, channelType, networkNumber]);

    this.channel = channel;
    this.type = channelType;
    this.net = networkNumber;

    if (extendedAssignment)
      this.extendedAssignment = extendedAssignment;

    this.setContent(content);
  };

  AssignChannelMessage.prototype.toString = function() {
    var msg = Message.prototype.toString.call(this) + " Ch " + this.channel + " Net " + this.net + " " + Channel.prototype.TYPE[this.type];

    if (this.extendedAssignment)
      msg += " extended assignment " + this.extendedAssignment;

    return msg;
  };

  module.exports = AssignChannelMessage;
  return module.exports;
