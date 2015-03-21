/* global define: true, ArrayBuffer: true, Uint8Array: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(function(require, exports, module) {

  'use strict';

  // Standard message :  bSYNC bLENGTH bID bCHANNELNUMBER CONTENT (8 bytes) bCRC (total length meta+content = 5+8 = 13 bytes)

  var

  // Extended data if requested by libconfig

    LibConfig = require('./extended/libConfig'),
    ChannelId = require('../channel/channelId'),
    RSSI = require('./extended/RSSI'),
    RXTimestamp = require('./extended/RXTimestamp');

  function Message(data, id, content) {

    this.timestamp = Date.now();

    if (data) {
      this.data = data;
      Message.prototype.decode.call(this, data);
      this.decode(data);
    }

    if (typeof id !== 'undefined')
      this.id = id;

    if (content) {
      this.setContent(content);
    }

  }

  Message.prototype.SYNC = 0xA4; // Every raw ANT message starts with SYNC

  Message.prototype.FILLER_BYTE = 0x00;

  Message.prototype.HEADER_LENGTH = 3; // SYNC+LENGTH+ID

  Message.prototype.PAYLOAD_LENGTH = 8;

  Message.prototype.CRC_LENGTH = 1;

  Message.prototype.iSYNC = 0; // Index of sync byte within message
  Message.prototype.iLENGTH = 1;
  Message.prototype.iID = 2;
  Message.prototype.iChannel = 3;
  Message.prototype.iPayload = 4;
  Message.prototype.iFlagsByte = 9;

  Message.prototype.decode = function(data) {
    // Standard message

    this.SYNC = data[Message.prototype.iSYNC];
    this.length = data[Message.prototype.iLENGTH];
    this.id = data[Message.prototype.iID];
    this.channel = data[Message.prototype.iChannel]; // Normally, but not all
    this.content = data.subarray(Message.prototype.HEADER_LENGTH, Message.prototype.HEADER_LENGTH + this.length);
    this.CRC = data[Message.prototype.HEADER_LENGTH + this.length];

    // Extended message (channel id, rx timestamp, rssi)

    // TO DO : Check Acknoledged Data and Advanced Burst Transfer data
    if ((this.id === Message.prototype.BROADCAST_DATA ||
        this.id === Message.prototype.BURST_TRANSFER_DATA) &&
      this.content.length > Message.prototype.iFlagsByte) {

      this.flagsByte = this.content[Message.prototype.iFlagsByte];
      //this.extendedData = new Uint8Array(this.payload.buffer.slice(10));
      this.extendedData = this.content.subarray(Message.prototype.iFlagsByte + 1); // Subarray creates a view to underlying arraybuffer
      // Check for channel ID
      // p.37 spec: relative order of extended messages; channel ID, RSSI, timestamp (based on 32kHz clock, rolls over each 2 seconds)
      if (this.flagsByte & LibConfig.prototype.CHANNEL_ID_ENABLED) {
        if (!this.channelId)
          this.channelId = new ChannelId();
        //this.channelId.decode(this.extendedData.buffer.slice(0, 4));
        this.channelId.decode(this.extendedData.subarray(0, 4));

        // Spec. p. 27 - single master controls multiple slaves - possible to have a 1 or 2-byte shared address field at the start of data payload
        //            sharedAddress = this.channelId.getSharedAddressType();
        //
        //            if (sharedAddress === ChannelId.prototype.SHARED_ADDRESS_TYPE.ADDRESS_1BYTE) //{
        //                this.sharedAddress = this.payload[0]; // 1 byte is the shared address 0 = broadcast to all slaves
        //                this.data = this.payload.subarray(2, 9);
        //
        //            } else if (sharedAddress === ChannelId.prototype.SHARED_ADDRESS_TYPE.ADDRESS_2BYTE) //{
        //                this.sharedAddress = (new DataView(this.payload,0,2)).getUint16(0,true); // 2-bytes LSB MSB shared address 0 = broadcast to all slaves
        //                this.data = this.payload.subarray(3, 9);
        //            }
      }

      if (this.flagsByte & LibConfig.prototype.RX_TIMESTAMP_ENABLED) {
        if (!this.RXTimestamp)
          this.RXTimestamp = new RXTimestamp();
        // this.RXTimestamp.decode(this.extendedData.buffer.slice(-2));
        this.RXTimestamp.decode(this.extendedData.subarray(-2));
      }

      if (!(this.flagsByte & LibConfig.prototype.CHANNEL_ID_ENABLED) && (this.flagsByte & LibConfig.prototype.RSSI_ENABLED)) {
        //this.RSSI.decode(this.extendedData.buffer.slice(0, 2));
        if (!this.RSSI)
          this.RSSI = new RSSI();
        this.RSSI.decode(this.extendedData.subarray(0, 2));
      }

      if ((this.flagsByte & LibConfig.prototype.CHANNEL_ID_ENABLED) && (this.flagsByte & LibConfig.prototype.RSSI_ENABLED)) {
        //this.RSSI.decode(this.extendedData.buffer.slice(4, 7));
        if (!this.RSSI)
          this.RSSI = new RSSI();
        this.RSSI.decode(this.extendedData.subarray(4, 7));
      }
    }
  };

  Message.prototype.toString = function(verbose) {

    var msg = Message.prototype.MESSAGE[this.id];

    if (!verbose)
      return msg;

    if (this.SYNC)
      msg += " SYNC 0x" + this.SYNC.toString(16) + " = " + this.SYNC;

    if (this.length)
      msg += " LEN 0x" + this.length.toString(16) + " = " + this.length;

    if (this.id)
      msg += " ID 0x" + this.id.toString(16) + " = " + this.id;

    //  if (this.payload)
    //    msg += " content " + this.payload.toString();

    if (this.CRC)
      msg += " CRC 0x" + this.CRC.toString(16) + " = " + this.CRC;

    return msg;

  };

  Message.prototype.getContent = function() {
    return this.content;
  };

  Message.prototype.setContent = function(content) {
    this.channel = content[0];
    this.content = content;
    return this;
  };

  // Get sequence nr. of burst 3 msb of channel byte
  Message.prototype.getSequenceNr = function() {
    return (this.content[0] & 0xe0) >> 5; // e = 1110
  };

  /*
  This function create a raw message
   SYNC = 10100100 = 0xA4 or 10100101 (MSB:LSB)
   CRC = XOR of all bytes in message
   Sending of LSB first = little endian NB!
  */
  Message.prototype.serialize = function() {

    var standardMessage = new Uint8Array(Message.prototype.HEADER_LENGTH+this.content.byteLength+1), //Message format : SYNC MSG_LENGTH MSG_ID MSG_CONTENT CRC
      iCRC;

    this.length = this.content.byteLength;

    standardMessage[0] = Message.prototype.SYNC;
    standardMessage[1] = this.length;
    standardMessage[2] = this.id;
    standardMessage.set(this.content, Message.prototype.HEADER_LENGTH);

    iCRC = this.length + Message.prototype.HEADER_LENGTH;
    standardMessage[iCRC] = this.getCRC(standardMessage.subarray(0, iCRC));

    return standardMessage;

  };

  // CheckSUM = XOR of all bytes in message
  Message.prototype.getCRC = function(messageBuffer) {

    var checksum = messageBuffer[0], // Should be SYNC 0xA4
      len = messageBuffer[1] + Message.prototype.HEADER_LENGTH, // Should be messageBuffer.length - 1
      byteNr;

    for (byteNr = 1; byteNr < len; byteNr++) {
      checksum = checksum ^ messageBuffer[byteNr];

    }

    return checksum;
  };

  Message.prototype.getMessageId = function() {
    return this.id;
  };

  // ANT message ID - from sec 9.3 ANT Message Summary ANT Message Protocol And Usage Rev 50

  // Config

  Message.prototype.UNASSIGN_CHANNEL = 0x41;
  Message.prototype.ASSIGN_CHANNEL = 0x42;
  Message.prototype.SET_CHANNEL_ID = 0x51;
  Message.prototype.SET_CHANNEL_PERIOD = 0x43;
  Message.prototype.SET_CHANNEL_SEARCH_TIMEOUT = 0x44;
  Message.prototype.SET_CHANNEL_RFFREQ = 0x45;
  Message.prototype.SET_NETWORK_KEY = 0x46;
  Message.prototype.SET_TRANSMIT_POWER = 0x47;
  Message.prototype.SET_SEARCH_WAVEFORM = 0x49;

  Message.prototype.SET_CHANNEL_TX_POWER = 0x60;
  Message.prototype.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT = 0x63;
  Message.prototype.SET_SERIAL_NUM_CHANNEL_ID = 0x65;
  Message.prototype.RXEXTMESGSENABLE = 0x66;

  Message.prototype.LIBCONFIG = 0x6E;

  Message.prototype.SET_PROXIMITY_SEARCH = 0x71;
  Message.prototype.EVENT_BUFFER_CONFIGURATION = 0x74;
  Message.prototype.SET_CHANNEL_SEARCH_PRIORITY = 0x75;
  Message.prototype.ADVANCED_BURST_CAPABILITIES = 0x78;
  Message.prototype.CONFIGURE_ADVANCED_BURST = 0x78;

  Message.prototype.RESET_SYSTEM = 0x4A;
  Message.prototype.OPEN_CHANNEL = 0x4B;
  Message.prototype.CLOSE_CHANNEL = 0x4C;
  Message.prototype.OPEN_RX_SCAN_MODE = 0x5B;
  Message.prototype.SLEEP_MESSAGE = 0xC5;
  Message.prototype.NOTIFICATION_STARTUP = 0x6F;
  Message.prototype.NOTIFICATION_SERIAL_ERROR = 0xAE;
  Message.prototype.ANT_VERSION = 0x3E;
  Message.prototype.CAPABILITIES = 0x54;
  Message.prototype.DEVICE_SERIAL_NUMBER = 0x61;

  Message.prototype.REQUEST = 0x4D;
  Message.prototype.CHANNEL_RESPONSE = 0x40;
  Message.prototype.CHANNEL_STATUS = 0x52;

  // DATA

  Message.prototype.BROADCAST_DATA = 0x4E;
  Message.prototype.ACKNOWLEDGED_DATA = 0x4F;
  Message.prototype.BURST_TRANSFER_DATA = 0x50;
  Message.prototype.ADVANCED_BURST_TRANSFER_DATA = 0x72;

  Message.prototype.EVENT = {
    0x4E: 'data',
    0x4F: 'ackdata',
    0x50: 'burstdata',
    0x72: 'advburstdata'
  };

/*  Message.prototype.NO_REPLY_MESSAGE = [

    Message.prototype.SLEEP_MESSAGE,

    Message.prototype.BROADCAST_DATA,
    Message.prototype.ACKNOWLEDGED_DATA,
    Message.prototype.BURST_TRANSFER_DATA,
    Message.prototype.ADVANCED_BURST_TRANSFER_DATA
  ]; */

  Message.prototype.ACK_MESSAGE = [
    Message.prototype.ACKNOWLEDGED_DATA,
    Message.prototype.BURST_TRANSFER_DATA,
    Message.prototype.ADVANCED_BURST_TRANSFER_DATA
  ];

  Message.prototype.OPEN_CLOSE_MESSAGE = [
    Message.prototype.OPEN_CHANNEL,
    Message.prototype.CLOSE_CHANNEL,
    Message.prototype.OPEN_RX_SCAN_MODE
  ];

  Message.prototype.CONFIG_MESSAGE = [
    Message.prototype.UNASSIGN_CHANNEL,
    Message.prototype.ASSIGN_CHANNEL,
    Message.prototype.SET_CHANNEL_ID,
    Message.prototype.SET_CHANNEL_PERIOD,
    Message.prototype.SET_CHANNEL_SEARCH_TIMEOUT,
    Message.prototype.SET_CHANNEL_RFFREQ,
    Message.prototype.SET_NETWORK_KEY,
    Message.prototype.SET_TRANSMIT_POWER,
    Message.prototype.SET_SEARCH_WAVEFORM,
    Message.prototype.SET_CHANNEL_TX_POWER,
    Message.prototype.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT,
    Message.prototype.SET_SERIAL_NUM_CHANNEL_ID,
    Message.prototype.RXEXTMESGSENABLE,
    Message.prototype.LIBCONFIG,
    Message.prototype.SET_PROXIMITY_SEARCH,
    Message.prototype.EVENT_BUFFER_CONFIGURATION,
    Message.prototype.SET_CHANNEL_SEARCH_PRIORITY,
    Message.prototype.CONFIGURE_ADVANCED_BURST
  ];

  Message.prototype.MESSAGE = {

    // Control messages

    0x4A: "Reset system",

    0x4B: "Open channel",

    0x4C: "Close channel",

    0x5B: "Open RX scan mode",

    0xC5: "Sleep message",

    // Notification messages

    0x6F: "Notification: Start up",

    0xAE: "Notification: Serial error",

    // Requested messages with REQUEST 0x4D

    0x3E: "ANT Version",

    0x54: "Capabilities",

    0x61: "Device Serial Number",

    0x74: "Event Buffer Configuration",

    0x78: "Advanced Burst Capabilities/Configuration",

    // Request/response

    0x4D: "Request",

    0x40: "Response/RF event",

    0x52: "Channel Status",

    // Config messages. All conf. commands receive a response, typically "RESPONSE_NO_ERROR"

    0x41: "Unassign Channel",

    0x42: "Assign Channel",

    0x51: "Set/Get Channel ID",

    0x43: "Set period (Tch)",

    0x44: "Set High priority (HP) search timeout",

    0x45: "Set RF frequency",

    0x46: "Set network key",

    0x47: "Set transmit power",

    0x49: "Search waveform",

    0x60: "Set Channel Tx Power",

    0x63: "Low priority (LP) search timeout",

    0x65: "Set Serial Num Channel ID",

    0x66: "Enable Extended Messages",

    0x6E: "Lib Config",

    0x71: "Set Proximity Search",

    0x75: "Channel Search Priority",

    // Data messages

    0x4E: "Broadcast Data",

    0x4F: "Acknowledged Data",

    0x50: "Burst Transfer Data",

    0x72: "Advanced Burst Transfer Data",

  };

  module.exports = Message;
  return module.exports;
});
