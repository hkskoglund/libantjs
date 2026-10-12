'use strict';
import Message from '../message.js';
import LibConfig from '../extended/lib-config.js';



class LibConfigMessage extends Message {
  constructor(libConfig) {

    super(undefined, Message.LIBCONFIG);

    this.encode(libConfig || 0);
  }

  encode(libConfig) {

    this.libConfig = libConfig;

    this.setContent(new Uint8Array([Message.FILLER_BYTE, libConfig]));
  }

  toString() {

    const enabledFeatures = [];
    if (this.libConfig & LibConfig.CHANNEL_ID_ENABLED)
      enabledFeatures.push('channel ID');
    if (this.libConfig & LibConfig.RSSI_ENABLED)
      enabledFeatures.push('RSSI');
    if (this.libConfig & LibConfig.RX_TIMESTAMP_ENABLED)
      enabledFeatures.push('receive timestamp');

    const unknownFlags = this.libConfig & ~(LibConfig.CHANNEL_ID_ENABLED |
      LibConfig.RSSI_ENABLED | LibConfig.RX_TIMESTAMP_ENABLED);
    if (unknownFlags)
      enabledFeatures.push('unknown flags 0x' + unknownFlags.toString(16));

    const description = enabledFeatures.length ? enabledFeatures.join(', ') : 'disabled';
    return Message.prototype.toString.call(this) + ' libconfig ' + this.libConfig +
      ' (0x' + this.libConfig.toString(16) + ': ' + description + ')';
  }
}

export default LibConfigMessage;
