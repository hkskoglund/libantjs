'use strict';

class AuthenticationType {
  constructor(type) {
    this.type = type;
  }

  get() {
    return this.type;
  }

  isPassthrough() {
    return this.type === AuthenticationType.PASSTHROUGH;
  }

  isPasskeyAndPairingOnly() {
    return this.type === AuthenticationType.PASSKEY_AND_PAIRING_ONLY;
  }

  isPairingOnly() {
    return this.type === AuthenticationType.PAIRING_ONLY;
  }

  toString() {

    switch (this.type) {
      case AuthenticationType.PASSTHROUGH:
        return "Pass-through (pairing & passkey optional)";
      case AuthenticationType.PAIRING_ONLY:
        return "Pairing only";
      case AuthenticationType.PASSKEY_AND_PAIRING_ONLY:
        return "Passkey and pairing only";
    }
  }

  static PASSTHROUGH = 0x00;
  static NOTAPPLICABLE = 0x01;
  static PAIRING_ONLY = 0x02;
  static PASSKEY_AND_PAIRING_ONLY = 0x03;
}






export default AuthenticationType;
