'use strict';
import ExtendedBroadcastDataMessage from './extended-broadcast-data-message.js';
import Message from '../message.js';



class ExtendedAcknowledgedDataMessage extends ExtendedBroadcastDataMessage {
  constructor(data) {

    super(data, Message.EXTENDED_ACKNOWLEDGED_DATA);
  }
}

export default ExtendedAcknowledgedDataMessage;
