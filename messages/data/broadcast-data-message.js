'use strict';

var Message = require('../message');

class BroadcastDataMessage extends Message {
  constructor(data, id = Message.prototype.BROADCAST_DATA) {

    super(data, id);
  }

  encode(channel, data) {

    if (!data || data.byteLength !== Message.prototype.PAYLOAD_LENGTH)
      throw new RangeError('Standard ANT data payload must contain exactly 8 bytes');
    encodeData(this, channel, data);
  }

  decode(data) {

    if (this.content.byteLength < Message.prototype.PAYLOAD_LENGTH + 1)
      throw new RangeError('Standard ANT data message must contain a channel and 8 data bytes');

    // 'RX' <Buffer a4 14 4e 01 04 00 f0 59 a3 5f c3 2b e0 af 41 78 01 10 00 69 00 ce f6 70>
    // 'Broadcast Data ID 0x4e Ch 1 ext. true Flag 0xe0' <Buffer 04 00 f0 59 a3 5f c3 2b>
    this.payload = data.subarray(Message.prototype.iPayload,Message.prototype.iPayload+Message.prototype.PAYLOAD_LENGTH);
  }

  toString() {

    var msg = Message.prototype.toString.call(this) + " Ch " + this.channel;

    if (this.extendedData) {
      msg += " Flags 0x" + this.flagsByte.toString(16);

      if (this.channelId)
        msg += " " + this.channelId.toString();

      if (this.RSSI)
        msg += " " + this.RSSI.toString();

      if (this.RXTimestamp)
        msg += " " + this.RXTimestamp.toString();
    }

    return msg;
  }
}

function encodeData(message, channel, data) {
  if (!data || typeof data.byteLength !== 'number')
    throw new TypeError('ANT data payload must be a byte array');

  message.content = new Uint8Array(data.byteLength + 1);
  message.content[0] = channel;
  message.content.set(data, 1);

  message.channel = channel;
  message.payload = data;
}

// Spec. p. 91

BroadcastDataMessage.prototype.encodeData = encodeData;

module.exports = BroadcastDataMessage;

