'use strict';

var EventEmitter = require('events'),
  Logger = require('./util/logger'),
  Channel = require('./channel/channel'),
  USBDevice = require('./usb/USBDevice'),
  USBNode = require('./usb/USBNode');

class Host extends EventEmitter {
  constructor(options) {
    super();

    this.options = Object.assign({}, options);
    this.log = new Logger(Object.assign({}, this.options, { logSource: this }));
    this.channel = new Array(Host.prototype.MAX_CHAN);

    for (let channel = 0; channel < Host.prototype.MAX_CHAN; channel++) {
      this.channel[channel] = new Channel(this.options, this, channel);
    }

    this.usb = new USBNode({
      log: this.options.log,
      debugLevel: this.options.debugLevel
    });
    this.usb.on(USBDevice.prototype.EVENT.ERROR, this.onUSBError.bind(this));
  }

  // Send a message to ANT
  sendMessage(message, event, channel, callback) {

    var msgBytes,
      messageStr,
      responseEvent,
      hasCallback = typeof callback === 'function',

      onSentToANT = function _onSentToANT(error, msg) {

        if (error) {

          if (this.log.logging) {
            this.log.error( 'TX failed of ' + messageStr, error);
          }

          if (event && hasCallback) {
            if (typeof channel !== 'number') {
              this.removeListener(event, callback);
            } else {
              this.channel[channel].removeListener(responseEvent, callback);
            }
          }

          if (hasCallback) {
            callback(error, msg);
          }
          return;
        }

        if (!event && hasCallback) { // i.e send acknowledged data
          callback(error, msg);
        }

      }.bind(this);

    if (event && hasCallback) {

      if (typeof channel !== 'number') {

        this.once(event, callback);

        if (this.log.logging)
          this.log.debug( 'Waiting for ' + event + ' - host');

      } else {

        responseEvent = event + '_0x' + message.id.toString(16);
        this.channel[channel].once(responseEvent, callback);

        if (this.log.logging)
          this.log.debug( 'Waiting for ' + responseEvent + ' channel ' + channel);
      }

    }

    messageStr = message.toString();

    if (this.log.logging) {
      this.log.debug( 'Sending ' + messageStr);
    }

    msgBytes = message.serialize();

    this.usb.transfer(msgBytes, onSentToANT);
  }
}

Host.prototype.MAX_CHAN = 8;

Host.prototype.ADVANCED_BURST = {
  ENABLE: 0x01,
  DISABLE: 0x02,
  MAX_PACKET_8BYTES: 0x01,
  MAX_PACKET_16BYTES: 0x02,
  MAX_PACKET_24BYTES: 0x03
};

Host.prototype.EVENT = {

  ERROR: 'error',

  // Data

  //BROADCAST: 'broadcast',
  BURST: 'burst', // Total burst , i.e all burst packets are received

  FAILED: 'EVENT_TRANSFER_TX_FAILED',
  COMPLETED: 'EVENT_TRANSFER_TX_COMPLETED',

  OK: 'RESPONSE_NO_ERROR'

};

require('./host/devices')(Host);
require('./host/profiles')(Host);
require('./host/commands')(Host);
require('./host/transfers')(Host);
require('./host/deserialize')(Host);

module.exports = Host;
