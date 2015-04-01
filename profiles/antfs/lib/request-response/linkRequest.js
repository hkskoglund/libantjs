/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  function LinkRequest(frequency, period, hostSerialNumber) {

    this.frequency = frequency;
    this.period = period;
    this.hostSerialNumber = hostSerialNumber;
  }

  LinkRequest.prototype.ID = 0x02;

  LinkRequest.prototype.serialize = function() {
    var command = new Uint8Array(8),
      dv = new DataView(command.buffer);

    command[0] = 0x44; // ANT-FS COMMAND message
    command[1] = this.ID;
    command[2] = this.frequency;
    command[3] = this.period;
    dv.setUint32(4, this.hostSerialNumber, true);

    return command;
  };

  LinkRequest.prototype.toString = function() {
    return 'LinkRequest ' + 'frequency ' + this.frequency + ' period ' + this.period + ' host SN ' + this.hostSerialNumber;
  };

  module.exports = LinkRequest;
  return module.exports;
