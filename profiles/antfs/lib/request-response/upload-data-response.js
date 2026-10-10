'use strict';

class UploadDataResponse {
  constructor(data) {
    if (data)
      this.deserialize(data);
  }

  deserialize(data) {

  // PACKET 1 - BEACON - stripped off

  // PACET 2

  // data[0] should be 0x44 ANT-FS RESPONSE/COMMAND
  // data[1] should be 0x8C;

  this.result = data[2];

  }

  toString() {

  let msg = this.constructor.name;

  switch (this.result) {

    case UploadDataResponse.OK:

      msg += ' OK';
      break;

    case UploadDataResponse.FAILED:

      msg += ' Failed';
      break;

  }

  return msg;
  }

  static OK = 0x00;
  static FAILED = 0x01;
  static ID = 0x8C;
}





export default UploadDataResponse;
