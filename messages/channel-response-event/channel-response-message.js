'use strict';
import Message from '../message.js';
import ChannelResponseEvent from '../../channel/channel-response-event.js';



class ChannelResponseMessage extends Message {
  constructor(data) {

    super(data, Message.CHANNEL_RESPONSE);
  }

  decode() {

    if (this.content.byteLength < 3)
      throw new RangeError('Channel response message must contain at least 3 bytes');

    var initiatingId = this.content[1],
      code = this.content[2];

    this.response = new ChannelResponseEvent(this.channel, initiatingId, code);

    // Extended event parameters (spec 9.5.6.2): encryption ID, optional 19-byte user information string
    if (code === ChannelResponseEvent.ENCRYPT_NEGOTIATION_SUCCESS || code === ChannelResponseEvent.ENCRYPT_NEGOTIATION_FAIL) {
      if (this.content.byteLength >= 7)
        this.response.encryptionId = this.content.subarray(3, 7);
      if (this.content.byteLength >= 26)
        this.response.userInformationString = this.content.subarray(7, 26);
    }
  }

  isRFevent() {

    return this.response.isRFevent();
  }

  toString() {

    return Message.prototype.toString.call(this) + " " + this.response.toString();
  }
}

export default ChannelResponseMessage;
