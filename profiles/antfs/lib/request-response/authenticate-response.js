'use strict';

class AuthenticateResponse {
  constructor(type, authenticationStringLength, clientSerialNumber) {
    if (typeof type === 'object' && type.constructor.name === 'Uint8Array') {
      this.deserialize(type);
    } else {
      this.type = type;
      this.authenticationStringLength = authenticationStringLength;
      this.clientSerialNumber = clientSerialNumber;
    }
  }

  deserialize(data) {
    let dv = new DataView(data.buffer),
      i;

    // data[0] should be 0x44 ANT-FS RESPONSE/COMMAND
    // data[1] should be 0x84;

    this.type = data[2];
    this.authenticationStringLength = data[3];
    this.authenticationString = '';
    this.clientSerialNumber = dv.getUint32(4 + data.byteOffset, true);

    for (i = 0; i < this.authenticationStringLength && data[8 + i] !== 0x00; i++) {
      this.authenticationString += String.fromCharCode(data[8 + i]); // Static method on String
    }

  }

  toString() {
    let msg = 'AUTHENTICATE ';

    switch (this.type) {
      case AuthenticateResponse.CLIENT_SERIAL_NUMBER:

        if (this.authenticationString)
          msg += 'name ' + this.authenticationString;
        break;

      case AuthenticateResponse.ACCEPT:

        msg += 'accept';
        break;

      case AuthenticateResponse.REJECT:
        msg += 'reject';
        break;
    }

    return msg + ', client serial number ' + this.clientSerialNumber;
  }

  static CLIENT_SERIAL_NUMBER = 0x00;
  static ACCEPT = 0x01;
  static REJECT = 0x02;
  static ID = 0x84;
}






export default AuthenticateResponse;
