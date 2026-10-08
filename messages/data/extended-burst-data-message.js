'use strict';

  var ChannelId = require('../../channel/channel-id'),
    Message = require('../message');

  function ExtendedBurstDataMessage(data) {
    Message.call(this, data, Message.prototype.EXTENDED_BURST_TRANSFER_DATA);
  }

  ExtendedBurstDataMessage.prototype = Object.create(Message.prototype);
  ExtendedBurstDataMessage.prototype.constructor = ExtendedBurstDataMessage;

  ExtendedBurstDataMessage.prototype.encode = function(sequenceChannel, channelId, data) {
    if (!Number.isInteger(sequenceChannel) || sequenceChannel < 0 || sequenceChannel > 0xFF)
      throw new RangeError('Extended ANT burst sequence/channel must be a byte');

    if (!data || typeof data.byteLength !== 'number' || data.byteLength !== Message.prototype.PAYLOAD_LENGTH)
      throw new RangeError('Extended ANT burst data must contain exactly 8 bytes');

    if (!channelId || !Number.isInteger(channelId.deviceNumber) ||
        channelId.deviceNumber < 0 || channelId.deviceNumber > 0xFFFF ||
        !Number.isInteger(channelId.deviceType) || channelId.deviceType < 0 || channelId.deviceType > 0xFF ||
        !Number.isInteger(channelId.transmissionType) || channelId.transmissionType < 0 || channelId.transmissionType > 0xFF)
      throw new TypeError('Extended ANT burst data requires a valid channel ID');

    this.content = new Uint8Array(13);
    this.content[0] = sequenceChannel;
    this.content[1] = channelId.deviceNumber & 0xFF;
    this.content[2] = channelId.deviceNumber >> 8;
    this.content[3] = channelId.deviceType;
    this.content[4] = channelId.transmissionType;
    this.content.set(data, 5);

    this.channel = sequenceChannel & 0x1F;
    this.sequenceNr = (sequenceChannel & 0xE0) >> 5;
    this.channelId = channelId;
    this.packet = data;
  };

  ExtendedBurstDataMessage.prototype.decode = function(data) {
    if (this.content.byteLength !== 13)
      throw new RangeError('Extended ANT burst message must contain a sequence/channel, channel ID and 8 data bytes');

    this.channel = this.content[0] & 0x1F;
    this.sequenceNr = (this.content[0] & 0xE0) >> 5;
    this.channelId = new ChannelId();
    this.channelId.decode(this.content.subarray(1, 5));
    this.packet = this.content.subarray(5, 13);
  };

  ExtendedBurstDataMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + ' Ch ' + this.channel + ' Sequence ' + this.sequenceNr +
      ' ' + this.channelId.toString();
  };

  module.exports = ExtendedBurstDataMessage;
