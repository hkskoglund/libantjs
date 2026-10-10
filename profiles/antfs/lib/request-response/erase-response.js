'use strict';

class EraseResponse {
  constructor(data) {
    if (data)
      this.deserialize(data);
  }

  deserialize(data) {
    // overview p. 59 in spec of response format

    // HEADER

    // data[0] should be 0x44 ANT-FS RESPONSE/COMMAND
    // data[1] should be 0x84;

    this.result = data[2];

  }

  toString() {
    let msg = 'ERASE ';

    switch (this.result) {

      case EraseResponse.OK:

        msg += 'OK';
        break;

      case EraseResponse.FAILED:

        msg += 'Failed';
        break;

      case EraseResponse.NOT_READY:

        msg += 'Not ready to erase';
        break;

    }

    return msg;
  }

  static OK = 0x00;
  static FAILED = 0x01;
  static NOT_READY = 0x03;
  static ID = 0x8B;
}






module.exports = EraseResponse;
