'use strict';
import BroadcastDataMessage from './broadcast-data-message.js';
import Message from '../message.js';



class AcknowledgedDataMessage extends BroadcastDataMessage {
  constructor(data, id = Message.ACKNOWLEDGED_DATA) {

    super(data, id);
  }
}

export default AcknowledgedDataMessage;

