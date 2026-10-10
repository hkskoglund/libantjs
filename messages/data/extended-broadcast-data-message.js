'use strict';
import ChannelId from '../../channel/channel-id.js';
import Message from '../message.js';



// Spec 9.5.9.1 - channel, channel ID (device number, device type, transmission type) and 8 data bytes
class ExtendedBroadcastDataMessage extends Message {
  constructor(data, id = Message.EXTENDED_BROADCAST_DATA) {

    super(data, id);
  }

  encode(channel, channelId, data) {

    if (!Number.isInteger(channel) || channel < 0 || channel > 0xFF)
      throw new RangeError('Extended ANT data channel must be a byte');

    if (!data || typeof data.byteLength !== 'number' || data.byteLength !== Message.PAYLOAD_LENGTH)
      throw new RangeError('Extended ANT data must contain exactly 8 bytes');

    if (!channelId || !Number.isInteger(channelId.deviceNumber) ||
        channelId.deviceNumber < 0 || channelId.deviceNumber > 0xFFFF ||
        !Number.isInteger(channelId.deviceType) || channelId.deviceType < 0 || channelId.deviceType > 0xFF ||
        !Number.isInteger(channelId.transmissionType) || channelId.transmissionType < 0 || channelId.transmissionType > 0xFF)
      throw new TypeError('Extended ANT data requires a valid channel ID');

    this.content = new Uint8Array(13);
    this.content[0] = channel;
    this.content[1] = channelId.deviceNumber & 0xFF;
    this.content[2] = channelId.deviceNumber >> 8;
    this.content[3] = channelId.deviceType;
    this.content[4] = channelId.transmissionType;
    this.content.set(data, 5);

    this.channel = channel;
    this.channelId = channelId;
    this.payload = data;
  }

  decode() {

    if (this.content.byteLength !== 13)
      throw new RangeError('Extended ANT data message must contain a channel, channel ID and 8 data bytes');

    this.channel = this.content[0];
    this.channelId = new ChannelId();
    this.channelId.decode(this.content.subarray(1, 5));
    this.payload = this.content.subarray(5, 13);
  }

  toString() {

    return Message.prototype.toString.call(this) + ' Ch ' + this.channel + ' ' + this.channelId.toString();
  }
}

export default ExtendedBroadcastDataMessage;
