/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

/*jshint -W097 */
'use strict';

function UploadDataResponse(data) {
  if (data)
    this.deserialize(data);
}

UploadDataResponse.prototype.OK = 0x00;
UploadDataResponse.prototype.FAILED = 0x01;

UploadDataResponse.prototype.ID = 0x8C;

UploadDataResponse.prototype.deserialize = function(data) {

  var dv = new DataView(data.buffer);

  // PACKET 1 - BEACON - stripped off

  // PACET 2

  // data[0] should be 0x44 ANT-FS RESPONSE/COMMAND
  // data[1] should be 0x84;

  this.result = data[2];

};

UploadDataResponse.prototype.toString = function() {

  var msg = this.constructor.name;

  switch (this.result) {

    case UploadDataResponse.prototype.OK:

      msg += 'OK';
      break;

    case UploadDataResponse.prototype.FAILED:

      msg += 'Failed';
      break;

  }

  return msg;
};

module.exports = UploadDataResponse;

