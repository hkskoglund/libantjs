'use strict';

class GeneralFilePermission {
  constructor(flags) {
    this.flags = flags;

    this.crypto = this.flags & GeneralFilePermission.BIT_MASK.CRYPTO ? true : false;
    this.append = this.flags & GeneralFilePermission.BIT_MASK.APPEND ? true : false;
    this.archive = this.flags & GeneralFilePermission.BIT_MASK.ARCHIVE ? true : false;
    this.erase = this.flags & GeneralFilePermission.BIT_MASK.ERASE ? true : false;
    this.write = this.flags & GeneralFilePermission.BIT_MASK.WRITE ? true : false;
    this.read = this.flags & GeneralFilePermission.BIT_MASK.READ ? true : false;

  }

  toString() {
    let msg = ' Flags = 0x' + this.flags.toString(16) + ' ';

    if (this.crypto)
      msg += 'Crypto ';

    if (this.append)
      msg += 'Append ';

    if (this.archive)
      msg += 'Archive ';

    if (this.erase)
      msg += 'Erase ';

    if (this.read)
      msg += 'Read ';

    if (this.write)
      msg += 'Write ';

    return msg;
  }

  static BIT_MASK = {
  CRYPTO: parseInt("00000100", 2),
  APPEND: parseInt("00001000", 2),
  ARCHIVE: parseInt("00010000", 2),
  ERASE: parseInt("00100000", 2),
  WRITE: parseInt("01000000", 2),
  READ: parseInt("10000000", 2)
};
}



export default GeneralFilePermission;
