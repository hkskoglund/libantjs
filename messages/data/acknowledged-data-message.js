'use strict';

var BroadcastDataMessage = require('./broadcast-data-message'),
  Message = require('../message');

class AcknowledgedDataMessage extends BroadcastDataMessage {
  constructor(data, id = Message.prototype.ACKNOWLEDGED_DATA) {

    super(data, id);
  }
}

module.exports = AcknowledgedDataMessage;

