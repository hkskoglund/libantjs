'use strict';

class EraseRequest {
  constructor(index) {
    this.index = index;
  }

  // Spec 12.7 Downloading - its a two packet burst
  serialize() {
    const command = new Uint8Array(4),
      dv = new DataView(command.buffer);

    command[0] = 0x44; // ANT-FS COMMAND message
    command[1] = this.constructor.ID;
    dv.setUint16(2, this.index, true);

    return command;
  }

  toString() {
    return 'ERASE index ' + this.index;
  }

  static ID = 0x0B;
}



export default EraseRequest;
