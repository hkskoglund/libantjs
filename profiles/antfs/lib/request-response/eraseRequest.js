/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

/*jshint -W097 */
'use strict';

function EraseRequest(index) {
  this.index = index;
}

EraseRequest.prototype.ID = 0x0B;

// Spec 12.7 Downloading - its a two packet burst
EraseRequest.prototype.serialize = function() {
  var command = new Uint8Array(4),
    dv = new DataView(command.buffer);

  command[0] = 0x44; // ANT-FS COMMAND message
  command[1] = this.ID;
  dv.setUint16(2, this.index, true);

  return command;
};

EraseRequest.prototype.toString = function() {
  return 'ERASE index ' + this.index;
};

module.exports = EraseRequest;

