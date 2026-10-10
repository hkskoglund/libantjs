'use strict';

class DisconnectCommand {
  constructor(timeDuration, appSpecificDuration) {
    this.timeDuration = timeDuration || DisconnectCommand.DISABLE;
    this.appSpecificDuration = appSpecificDuration || DisconnectCommand.DISABLE;
  }

  serialize() {
    const command = new Uint8Array(4);

    command[0] = 0x44; // ANT-FS COMMAND message
    command[1] = this.constructor.ID;
    command[2] = this.timeDuration;
    command[3] = this.appSpecificDuration;

    return command;
  }

  toString() {
    return 'DISCONNECT ' + ' time duration ' + this.timeDuration + ' app specific duration ' + this.appSpecificDuration;
  }

  static RETURN_TO_LINK_LAYER = 0x00;
  static RETURN_TO_BROADCAST_MODE = 0x01;
  static INVALID = 0x00;
  static DISABLE = 0x00;
  static ID = 0x03;
}







export default DisconnectCommand;
