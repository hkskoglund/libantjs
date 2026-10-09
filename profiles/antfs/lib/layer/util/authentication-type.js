'use strict';

class AuthenticationType {
  constructor(type) {
    this.type = type;
  }

  get() {
    return this.type;
  }

  isPassthrough() {
    return this.type === AuthenticationType.prototype.PASSTHROUGH;
  }

  isPasskeyAndPairingOnly() {
    return this.type === AuthenticationType.prototype.PASSKEY_AND_PAIRING_ONLY;
  }

  isPairingOnly() {
    return this.type === AuthenticationType.prototype.PAIRING_ONLY;
  }

  toString() {

    switch (this.type) {
      case AuthenticationType.prototype.PASSTHROUGH:
        return "Pass-through (pairing & passkey optional)";
      case AuthenticationType.prototype.PAIRING_ONLY:
        return "Pairing only";
      case AuthenticationType.prototype.PASSKEY_AND_PAIRING_ONLY:
        return "Passkey and pairing only";
    }
  }
}

AuthenticationType.prototype.PASSTHROUGH = 0x00;
AuthenticationType.prototype.NOTAPPLICABLE = 0x01;
AuthenticationType.prototype.PAIRING_ONLY = 0x02;
AuthenticationType.prototype.PASSKEY_AND_PAIRING_ONLY = 0x03;

module.exports = AuthenticationType;
