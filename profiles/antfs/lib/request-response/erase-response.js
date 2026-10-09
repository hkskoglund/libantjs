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

      case EraseResponse.prototype.OK:

        msg += 'OK';
        break;

      case EraseResponse.prototype.FAILED:

        msg += 'Failed';
        break;

      case EraseResponse.prototype.NOT_READY:

        msg += 'Not ready to erase';
        break;

    }

    return msg;
  }
}

EraseResponse.prototype.OK = 0x00;
EraseResponse.prototype.FAILED = 0x01;
EraseResponse.prototype.NOT_READY = 0x03;
EraseResponse.prototype.ID = 0x8B;

module.exports = EraseResponse;
