'use strict';

class LinkRequest {
  constructor(frequency, period, hostSerialNumber) {
    this.frequency = frequency;
    this.period = period;
    this.hostSerialNumber = hostSerialNumber;
  }

  serialize() {
    const command = new Uint8Array(8),
      dv = new DataView(command.buffer);

    command[0] = 0x44; // ANT-FS COMMAND message
    command[1] = this.ID;
    command[2] = this.frequency;
    command[3] = this.period;
    dv.setUint32(4, this.hostSerialNumber, true);

    return command;
  }

  toString() {
    return 'LinkRequest ' + 'frequency ' + this.frequency + ' period ' + this.period + ' host ' + this.hostSerialNumber;
  }
}

LinkRequest.prototype.ID = 0x02;

module.exports = LinkRequest;
