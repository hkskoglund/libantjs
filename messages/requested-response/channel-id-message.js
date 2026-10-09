'use strict';

var Message = require('../message'),
  ChannelId = require('../../channel/channel-id');

class ChannelIdMessage extends Message {
  constructor(data) {

    super(data);
  }

  decode() {

    var deviceNum = (new DataView(this.content.buffer)).getUint16(this.content.byteOffset + 1, true),
      deviceType = this.content[3],
      transmissionType = this.content[4];

    this.channelId = new ChannelId(deviceNum, deviceType, transmissionType);
  }

  getId() {

    return this.channelId;
  }

  toString() {

    return Message.prototype.toString.call(this) + " Ch " + this.channel + " " + this.channelId.toString();
  }
}

module.exports = ChannelIdMessage;

