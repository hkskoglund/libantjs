'use strict';

var Message = require('../message'),
  Channel = require('../../channel/channel');

class AssignChannelMessage extends Message {
  constructor(channel, channelType, networkNumber, extendedAssignment) {

    super(undefined, Message.ASSIGN_CHANNEL);
    this.encode(channel, channelType, networkNumber, extendedAssignment);
  }

  encode(channel, channelType, networkNumber, extendedAssignment) {

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
  }

  toString() {

    var msg = Message.prototype.toString.call(this) + " Ch " + this.channel + " Net " + this.net + " " + Channel.TYPE[this.type];

    if (this.extendedAssignment)
      msg += " extended assignment " + this.extendedAssignment;

    return msg;
  }
}

module.exports = AssignChannelMessage;

