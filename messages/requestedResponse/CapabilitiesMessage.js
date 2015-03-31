/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message');

  function CapabilitiesMessage(data) {

    Message.call(this, data);

  }

  CapabilitiesMessage.prototype = Object.create(Message.prototype);

  CapabilitiesMessage.prototype.constructor = CapabilitiesMessage;

  // ANT Message Protocol and Usage. rev 5.0b - page 115
  CapabilitiesMessage.prototype.decode = function(data) {

    this.MAX_CHAN = this.content[0];
    this.MAX_NET = this.content[1];

    this.standardOptions = this.content[2];

    this.advancedOptions = this.content[3];

    // Documentation update http://www.thisisant.com/forum/viewthread/4250/

    this.advancedOptions2 = this.content[4];

    this.advancedOptions3 = this.content[6];

    this.advancedOptions4 = this.content[7];

    this.maxSensRcoreChannels = this.content[5];

    this.NO_RECEIVE_CHANNELS = this.standardOptions & 0x01;
    this.NO_TRANSMIT_CHANNELS = this.standardOptions & 0x02;
    this.NO_RECEIVE_MESSAGES = this.standardOptions & (1 << 3);
    this.NO_TRANSMIT_MESSAGES = this.standardOptions & (1 << 4);
    this.NO_ACKD_MESSAGES = this.standardOptions & (1 << 5);
    this.NO_BURST_MESSAGES = this.standardOptions & (1 << 6);

    this.NETWORK_ENABLED = this.advancedOptions & 0x02;
    this.SERIAL_NUMBER_ENABLED = this.advancedOptions & (1 << 3);
    this.PER_CHANNEL_TX_POWER_ENABLED = this.advancedOptions & (1 << 4);
    this.LOW_PRIORITY_SEARCH_ENABLED = this.advancedOptions & (1 << 5);
    this.SCRIPT_ENABLED = this.advancedOptions & (1 << 6);
    this.SEARCH_LIST_ENABLED = this.advancedOptions & (1 << 7);

    if (this.advancedOptions2 !== undefined) {
      this.LED_ENABLED = this.advancedOptions2 & 0x01;
      this.EXT_MESSAGE_ENABLED = this.advancedOptions2 & 0x02;
      this.SCAN_MODE_ENABLED = this.advancedOptions2 & (1 << 2);
      this.PROXY_SEARCH_ENABLED = this.advancedOptions2 & (1 << 4);
      this.EXT_ASSIGN_ENABLED = this.advancedOptions2 & (1 << 5);
      this.FS_ANTFS_ENABLED = this.advancedOptions2 & (1 << 6); // (1 << n) = set bit n high (bit numbered from 0 - n)
    }

    // ANT USB 2 does not have advanced options 3, so it will be undefined

    if (this.advancedOptions3 !== undefined) {
      this.ADVANCED_BURST_ENABLED = this.advancedOptions3 & 0x01;
      this.EVENT_BUFFERING_ENABLED = this.advancedOptions3 & 0x02;
      this.EVENT_FILTERING_ENABLED = this.advancedOptions3 & (1 << 2);
      this.HIGH_DUTY_SEARCH_ENABLED = this.advancedOptions3 & (1 << 3);
      this.SEARCH_SHARING_ENABLED = this.advancedOptions3 & (1 << 4);
      this.SELECTIVE_DATA_ENABLED = this.advancedOptions3 & (1 << 6);
      this.ENCRYPTED_CHANNEL_ENABLED = this.advancedOptions3 & (1 << 7);
    }

    if (this.advancedOptions4 !== undefined) {
      this.RFACTIVE_NOTIFICATION_ENABLED = this.advancedOptions4 & 0x01; // Bit 0
      // Bit 1-7 reserved
    }

  };

  CapabilitiesMessage.prototype.toString = function() {

    var msg = Message.prototype.toString.call(this) + " Channels " + this.getNumberOfChannels() + " | Networks " + this.getNumberOfNetworks() + ' | sensRcore channels ' + this.maxSensRcoreChannels + ' | ';

    msg += (this.standardOptions.NO_RECEIVE_CHANNELS ? '+' : '-') + "No receive channels | ";

    msg += (this.standardOptions.NO_TRANSMIT_CHANNELS ? '+' : '-') + "No transmit channels | ";

    msg += (this.standardOptions.NO_RECEIVE_MESSAGES ? '+' : '-') + "No receive messages | ";

    msg += (this.standardOptions.NO_TRANSMIT_MESSAGES ? '+' : '-') + "No transmit messages | ";

    msg += (this.standardOptions.NO_ACKD_MESSAGES ? '+' : '-') + "No ackd. messages | ";

    msg += (this.standardOptions.NO_BURST_MESSAGES ? '+' : '-') + "No burst messages | ";


    msg += (this.advancedOptions.NETWORK_ENABLED ? '+' : '-') + "Network | ";

    msg += (this.advancedOptions.SERIAL_NUMBER_ENABLED ? '+' : '-') + "Serial number | ";

    msg += (this.advancedOptions.PER_CHANNEL_TX_POWER_ENABLED ? '+' : '-') + "Per channel Tx Power | ";

    msg += (this.advancedOptions.LOW_PRIORITY_SEARCH_ENABLED ? '+' : '-') + "Low priority search | ";

    msg += (this.advancedOptions.SCRIPT_ENABLED ? '+' : '-') + "Script | ";

    msg += (this.advancedOptions.SEARCH_LIST_ENABLED ? '+' : '-') + "Search list | ";


    if (this.advancedOptions2) {
      msg += (this.advancedOptions2.LED_ENABLED ? '+' : '-') + "Led | ";

      msg += (this.advancedOptions2.EXT_MESSAGE_ENABLED ? '+' : '-') + "Extended messages | ";

      msg += (this.advancedOptions2.SCAN_MODE_ENABLED ? '+' : '-') + "Scan mode | ";

      msg += (this.advancedOptions2.PROXY_SEARCH_ENABLED ? '+' : '-') + "Proximity search | ";

      msg += (this.advancedOptions2.EXT_ASSIGN_ENABLED ? '+' : '-') + "Extended assign | ";

      msg += (this.advancedOptions2.FS_ANTFS_ENABLED ? '+' : '-') + "ANT-FS | ";

    }

    if (this.advancedOptions3) {
      msg += (this.advancedOptions3.ADVANCED_BURST_ENABLED ? '+' : '-') + 'Advanced burst |';

      msg += (this.advancedOptions3.EVENT_BUFFERING_ENABLED ? '+' : '-') + "Event buffering | ";

      msg += (this.advancedOptions3.EVENT_FILTERING_ENABLED ? '+' : '-') + "Event filtering | ";

      msg += (this.advancedOptions3.HIGH_DUTY_SEARCH_ENABLED ? '+' : '-') + "High duty search | ";

      msg += (this.advancedOptions3.SEARCH_SHARING_ENABLED ? '+' : '-') + "Search sharing | ";

      msg += (this.advancedOptions3.ENCRYPTED_CHANNEL_ENABLED ? '+' : '-') + "Encrypted channel | ";

      msg += (this.advancedOptions3.SELECTIVE_DATA_ENABLED ? '+' : '-') + "Selective data update | ";

    }

    if (this.advancedOptions4) {
      msg += (this.advancedOptions4.RFACTIVE_NOTIFICATION_ENABLED ? '+' : '-') + "RF Active notification | ";

    }

    if (this.standardOptions !== undefined) msg += 'S.O ' + this.standardOptions.toString(2) + "b = " + this.standardOptions + '|';
    if (this.advancedOptions !== undefined) msg += ' A.O ' + this.advancedOptions.toString(2) + "b = " + this.advancedOptions + '|';
    if (this.advancedOptions2 !== undefined) msg += ' A.O2 ' + this.advancedOptions2.toString(2) + "b = " + this.advancedOptions2 + '|';
    if (this.advancedOptions3 !== undefined) msg += ' A.O3 ' + this.advancedOptions3.toString(2) + "b = " + this.advancedOptions3 + '|';
    if (this.advancedOptions4 !== undefined) msg += ' A.O4 ' + this.advancedOptions4.toString(2) + "b " + this.advancedOptions4;

    return msg;
  };

  module.exports = CapabilitiesMessage;
  return module.exports;
