'use strict';

  function DisconnectCommand(timeDuration, appSpecificDuration) {
    this.timeDuration = timeDuration || DisconnectCommand.prototype.DISABLE;
    this.appSpecificDuration = appSpecificDuration || DisconnectCommand.prototype.DISABLE;

  }

  DisconnectCommand.prototype.RETURN_TO_LINK_LAYER = 0x00;
  DisconnectCommand.prototype.RETURN_TO_BROADCAST_MODE = 0x01;
  DisconnectCommand.prototype.INVALID = 0x00;
  DisconnectCommand.prototype.DISABLE = 0x00;

  DisconnectCommand.prototype.ID = 0x03;

  DisconnectCommand.prototype.serialize = function() {
    var command = new Uint8Array(4);

    command[0] = 0x44; // ANT-FS COMMAND message
    command[1] = this.ID;
    command[2] = this.timeDuration;
    command[3] = this.appSpecificDuration;

    return command;
  };

  DisconnectCommand.prototype.toString = function() {
    return 'DISCONNECT ' + ' time duration ' + this.timeDuration + ' app specific duration ' + this.appSpecificDuration;
  };

  module.exports = DisconnectCommand;
  
