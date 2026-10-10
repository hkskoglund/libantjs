'use strict';

var { EventEmitter, once } = require('events'),
  Logger = require('./util/logger'),
  Channel = require('./channel/channel'),
  USBDevice = require('./usb/USBDevice'),
  USBNode = require('./usb/USBNode');

class Host extends EventEmitter {
  static MAX_CHAN = 8;

  static ADVANCED_BURST = {
    ENABLE: 0x01,
    DISABLE: 0x02,
    MAX_PACKET_8BYTES: 0x01,
    MAX_PACKET_16BYTES: 0x02,
    MAX_PACKET_24BYTES: 0x03
  };

  static EVENT = {

    ERROR: 'error',

    // Data

    //BROADCAST: 'broadcast',
    BURST: 'burst', // Total burst , i.e all burst packets are received

    FAILED: 'EVENT_TRANSFER_TX_FAILED',
    COMPLETED: 'EVENT_TRANSFER_TX_COMPLETED',

    OK: 'RESPONSE_NO_ERROR'

  };

  constructor(options) {
    super();

    this.options = Object.assign({}, options);
    this.log = new Logger(Object.assign({}, this.options, { logSource: this }));
    this.channel = new Array(Host.MAX_CHAN);

    for (let channel = 0; channel < Host.MAX_CHAN; channel++) {
      this.channel[channel] = new Channel(this.options, this, channel);
    }

    this.usb = new USBNode({
      log: this.options.log,
      debugLevel: this.options.debugLevel
    });
    this.usb.on(USBDevice.EVENT.ERROR, this.onUSBError.bind(this));
  }

  // Send a message to ANT. Resolves with the response message when a response event is awaited, otherwise when the transfer completes.
  async sendMessage(message, event, channel) {
    const emitter = typeof channel === 'number' ? this.channel[channel] : this;
    const responseEvent = typeof channel === 'number' && event ? event + '_0x' + message.id.toString(16) : event;
    const messageStr = message.toString();
    let response;
    let controller;

    if (event) {
      controller = new AbortController();
      response = once(emitter, responseEvent, { signal: controller.signal });

      if (this.log.logging)
        this.log.debug('Waiting for ' + responseEvent + (typeof channel === 'number' ? ' channel ' + channel : ' - host'));
    }

    if (this.log.logging) {
      this.log.debug('Sending ' + messageStr);
    }

    try {
      await this.usb.transfer(message.serialize());
    } catch (error) {
      if (this.log.logging) {
        this.log.error('TX failed of ' + messageStr, error);
      }

      if (controller) {
        controller.abort();
        response.catch(() => {});
      }
      throw error;
    }

    if (!response) {
      return undefined;
    }

    const [error, responseMessage] = await response;
    if (error) {
      throw error;
    }
    return responseMessage;
  }
}

require('./host/devices')(Host);
require('./host/profiles')(Host);
require('./host/commands')(Host);
require('./host/transfers')(Host);
require('./host/deserialize')(Host);

module.exports = Host;
