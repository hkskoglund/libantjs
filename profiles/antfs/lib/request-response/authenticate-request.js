'use strict';

class AuthenticateRequest {
  constructor(commandType, authenticationStringLength, hostSerialNumber) {
    this.commandType = commandType || AuthenticateRequest.PROCEED_TO_TRANSPORT;
    this.authenticationStringLength = authenticationStringLength || 0;
    this.hostSerialNumber = hostSerialNumber || 0;
  }

  requestProceedToTransport(hostSerialNumber) {
    this.request(AuthenticateRequest.PROCEED_TO_TRANSPORT, hostSerialNumber);
  }

  requestSerialNumber(hostSerialNumber) {
    this.request(AuthenticateRequest.REQUEST_CLIENT_DEVICE_SERIAL_NUMBER, hostSerialNumber);
  }

  requestPairing(hostSerialNumber, hostname) {
    if (hostname)
      this.hostname = hostname;
    this.request(AuthenticateRequest.REQUEST_PAIRING, hostSerialNumber, hostname);
  }

  requestPasskeyExchange(hostSerialNumber, passkey) {
    this.request(AuthenticateRequest.REQUEST_PASSKEY_EXCHANGE, hostSerialNumber, passkey);
  }

  request(commandType, hostSerialNumber, authenticationString) {
    this.commandType = commandType;

    if (authenticationString) {
      this.authenticationStringLength = authenticationString.length;
      this.authenticationString = authenticationString;
    } else
      this.authenticationStringLength = 0;

    this.hostSerialNumber = hostSerialNumber;
  }

  serialize() {
    let command = new Uint8Array(8 + this.authenticationStringLength),
      dv = new DataView(command.buffer),
      byteNr;

    command[0] = 0x44; // ANT-FS COMMAND message
    command[1] = this.constructor.ID;
    command[2] = this.commandType;
    command[3] = this.authenticationStringLength;
    dv.setUint32(4, this.hostSerialNumber, true);

    // Host friendly name if pairing, client passkey if paskey exchange

    if (this.authenticationStringLength) {
      for (byteNr = 0; byteNr <= this.authenticationStringLength; byteNr++) {
        command[8 + byteNr] = this.authenticationString.charCodeAt(byteNr);
      }
    }

    return command;
  }

  toString() {
    let cmdType;

    switch (this.commandType) {

      case AuthenticateRequest.PROCEED_TO_TRANSPORT:

        cmdType = 'proceed to transport';
        break;

      case AuthenticateRequest.REQUEST_CLIENT_DEVICE_SERIAL_NUMBER:

        cmdType = 'get client serial number';
        break;

      case AuthenticateRequest.REQUEST_PAIRING:

        cmdType = 'pairing';
        if (this.authenticationStringLength)
          cmdType += ', hostname ' + this.authenticationString;
        break;

      case AuthenticateRequest.REQUEST_PASSKEY_EXCHANGE:

        cmdType = 'passkey exchange';
        break;
    }

    return 'AUTHENTICATE ' + cmdType + ' host serial number ' + this.hostSerialNumber;
  }

  static PROCEED_TO_TRANSPORT = 0x00;
  static REQUEST_CLIENT_DEVICE_SERIAL_NUMBER = 0x01;
  static REQUEST_PAIRING = 0x02;
  static REQUEST_PASSKEY_EXCHANGE = 0x03;
  static ID = 0x04;
}

 // Pass-through





module.exports = AuthenticateRequest;
