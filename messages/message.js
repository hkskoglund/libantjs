'use strict';
import LibConfig from './extended/lib-config.js';
import ChannelId from '../channel/channel-id.js';
import RSSI from './extended/rssi.js';
import RXTimestamp from './extended/rx-timestamp.js';

// Standard message :  bSYNC bLENGTH bID bCHANNELNUMBER CONTENT (8 bytes) bCRC (total length meta+content = 5+8 = 13 bytes)



class Message {
  constructor(data, id, content) {

    this.timestamp = Date.now();

    if (data) {
      this.data = data;
      Message.prototype.decode.call(this, data);
      if (typeof id !== 'undefined' && this.id !== id)
        throw new Error('Unexpected message ID: expected 0x' + id.toString(16) + ', received 0x' + this.id.toString(16));
      this.decode(data);
    }

    if (typeof id !== 'undefined')
      this.id = id;

    if (content) {
      this.setContent(content);
    }
  }

  decode(data) {

    var frameError = Message.prototype.getFrameError(data),
      extendedDataOffset = 0;

    if (frameError)
      throw new Error(frameError);

    // Standard message

    this.constructor.SYNC = data[Message.iSYNC];
    this.length = data[Message.iLENGTH];
    this.id = data[Message.iID];
    this.channel = data[Message.iChannel]; // Normally, but not all
    this.content = data.subarray(Message.HEADER_LENGTH, Message.HEADER_LENGTH + this.length);
    this.CRC = data[Message.HEADER_LENGTH + this.length];

    // Extended message (channel id, rx timestamp, rssi)

    // TO DO : Check Advanced Burst Transfer data
    if ((this.id === Message.BROADCAST_DATA ||
        this.id === Message.ACKNOWLEDGED_DATA ||
        this.id === Message.BURST_TRANSFER_DATA) &&
      this.content.length > Message.iFlagsByte) {

      this.flagsByte = this.content[Message.iFlagsByte];
      this.extendedData = this.content.subarray(Message.iFlagsByte + 1); // Subarray creates a view to underlying arraybuffer
      // Check for channel ID
      // p.37 spec: relative order of extended messages; channel ID, RSSI, timestamp (based on 32kHz clock, rolls over each 2 seconds)
      if (this.flagsByte & LibConfig.CHANNEL_ID_ENABLED) {
        if (this.extendedData.length < 4) {
          this.extendedDataError = 'Channel ID data must contain at least 4 bytes';
          return;
        }

        if (!this.channelId)
          this.channelId = new ChannelId();
        this.channelId.decode(this.extendedData.subarray(extendedDataOffset, extendedDataOffset + 4));
        extendedDataOffset += 4;

        // Spec. p. 27 - single master controls multiple slaves - possible to have a 1 or 2-byte shared address field at the start of data payload
      }

      if (this.flagsByte & LibConfig.RSSI_ENABLED) {
        if (this.extendedData.length < extendedDataOffset + 3) {
          this.extendedDataError = 'RSSI data must contain at least 3 bytes';
          return;
        }
        if (!this.RSSI)
          this.RSSI = new RSSI();
        this.RSSI.decode(this.extendedData.subarray(extendedDataOffset, extendedDataOffset + 3));
        extendedDataOffset += 3;
      }

      if (this.flagsByte & LibConfig.RX_TIMESTAMP_ENABLED) {
        if (this.extendedData.length < extendedDataOffset + 2) {
          this.extendedDataError = 'RX timestamp data must contain at least 2 bytes';
          return;
        }
        if (!this.RXTimestamp)
          this.RXTimestamp = new RXTimestamp();
        this.RXTimestamp.decode(this.extendedData.subarray(extendedDataOffset, extendedDataOffset + 2));
      }
    }
  }

  getFrameError(data) {

    var minimumLength = Message.HEADER_LENGTH + Message.CRC_LENGTH,
      totalLength;

    if (!data || typeof data.subarray !== 'function' || typeof data.byteLength !== 'number')
      return 'Message data must be a byte array';

    if (data.byteLength < minimumLength)
      return 'Message is shorter than the minimum frame length';

    totalLength = data[Message.iLENGTH] + minimumLength;

    if (data.byteLength < totalLength)
      return 'Message is shorter than its declared length';

    if (data.byteLength > totalLength)
      return 'Message is longer than its declared length';

    if (data[Message.iSYNC] !== Message.SYNC)
      return 'Invalid message SYNC';

    if (data[totalLength - 1] !== Message.prototype.getCRC.call(this, data.subarray(0, totalLength - 1)))
      return 'Invalid message CRC';
  }

  toString(verbose) {

    var msg = Message.MESSAGE[this.id];

    if (!verbose)
      return msg;

    if (this.constructor.SYNC)
      msg += " SYNC 0x" + this.constructor.SYNC.toString(16) + " = " + this.constructor.SYNC;

    if (this.length)
      msg += " LEN 0x" + this.length.toString(16) + " = " + this.length;

    if (this.id)
      msg += " ID 0x" + this.id.toString(16) + " = " + this.id;

    if (this.CRC)
      msg += " CRC 0x" + this.CRC.toString(16) + " = " + this.CRC;

    return msg;
  }

  getContent() {

    return this.content;
  }

  setContent(content) {

    this.channel = content[0];
    this.content = content;
    return this;
  }

  getSequenceNr() {

    return (this.content[0] & 0xe0) >> 5; // e = 1110
  }

  serialize() {

    var standardMessage,
      iCRC;

    if (this.content.byteLength > 0xFF)
      throw new RangeError('Message content must not exceed 255 bytes');

    standardMessage = new Uint8Array(Message.HEADER_LENGTH + this.content.byteLength + 1);
    this.length = this.content.byteLength;

    standardMessage[0] = Message.SYNC;
    standardMessage[1] = this.length;
    standardMessage[2] = this.id;
    standardMessage.set(this.content, Message.HEADER_LENGTH);

    iCRC = this.length + Message.HEADER_LENGTH;
    standardMessage[iCRC] = this.getCRC(standardMessage.subarray(0, iCRC));

    return standardMessage;
  }

  getCRC(messageBuffer) {

    var checksum = messageBuffer[0], // Should be SYNC 0xA4
      len = messageBuffer[1] + Message.HEADER_LENGTH, // Should be messageBuffer.length - 1
      byteNr;

    for (byteNr = 1; byteNr < len; byteNr++) {
      checksum = checksum ^ messageBuffer[byteNr];

    }

    return checksum;
  }

  getMessageId() {

    return this.id;
  }

  static SYNC = 0xA4;
  static FILLER_BYTE = 0x00;
  static HEADER_LENGTH = 3;
  static PAYLOAD_LENGTH = 8;
  static CRC_LENGTH = 1;
  static iSYNC = 0;
  static iLENGTH = 1;
  static iID = 2;
  static iChannel = 3;
  static iPayload = 4;
  static iFlagsByte = 9;
  static UNASSIGN_CHANNEL = 0x41;
  static ASSIGN_CHANNEL = 0x42;
  static SET_CHANNEL_ID = 0x51;
  static SET_CHANNEL_PERIOD = 0x43;
  static SET_CHANNEL_SEARCH_TIMEOUT = 0x44;
  static SET_CHANNEL_RFFREQ = 0x45;
  static SET_NETWORK_KEY = 0x46;
  static SET_TRANSMIT_POWER = 0x47;
  static SET_SEARCH_WAVEFORM = 0x49;
  static SET_CHANNEL_TX_POWER = 0x60;
  static SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT = 0x63;
  static SET_SERIAL_NUM_CHANNEL_ID = 0x65;
  static RXEXTMESGSENABLE = 0x66;
  static LIBCONFIG = 0x6E;
  static SET_PROXIMITY_SEARCH = 0x71;
  static EVENT_BUFFER_CONFIGURATION = 0x74;
  static SET_CHANNEL_SEARCH_PRIORITY = 0x75;
  static ADD_CHANNEL_ID = 0x59;
  static CONFIG_ID_LIST = 0x5A;
  static ENABLE_LED = 0x68;
  static ENABLE_CRYSTAL = 0x6D;
  static FREQUENCY_AGILITY = 0x70;
  static SET_128BIT_NETWORK_KEY = 0x76;
  static HIGH_DUTY_SEARCH = 0x77;
  static CHANNEL_SEARCH_SHARING = 0x81;
  static SET_USB_DESCRIPTOR_STRING = 0xC7;
  static INIT_CW_TEST_MODE = 0x53;
  static CW_TEST_MODE = 0x48;
  static ADVANCED_BURST_CAPABILITIES = 0x78;
  static CONFIGURE_ADVANCED_BURST = 0x78;
  static RESET_SYSTEM = 0x4A;
  static OPEN_CHANNEL = 0x4B;
  static CLOSE_CHANNEL = 0x4C;
  static OPEN_RX_SCAN_MODE = 0x5B;
  static SLEEP_MESSAGE = 0xC5;
  static NOTIFICATION_STARTUP = 0x6F;
  static NOTIFICATION_SERIAL_ERROR = 0xAE;
  static ANT_VERSION = 0x3E;
  static CAPABILITIES = 0x54;
  static DEVICE_SERIAL_NUMBER = 0x61;
  static REQUEST = 0x4D;
  static CHANNEL_RESPONSE = 0x40;
  static CHANNEL_STATUS = 0x52;
  static BROADCAST_DATA = 0x4E;
  static ACKNOWLEDGED_DATA = 0x4F;
  static BURST_TRANSFER_DATA = 0x50;
  static EXTENDED_BURST_TRANSFER_DATA = 0x5F;
  static ADVANCED_BURST_TRANSFER_DATA = 0x72;
  static EVENT = {
  0x4E: 'data',
  0x4F: 'ackdata',
  0x50: 'burstdata',
  0x5F: 'extburstdata',
  0x72: 'advburstdata'
};
  static MESSAGE = {

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

  0x59: "Add Channel ID to List",

  0x5A: "Config ID List",

  0x68: "Enable LED",

  0x6D: "Enable Crystal",

  0x70: "Frequency Agility",

  0x76: "Set 128-bit Network Key",

  0x77: "High Duty Search",

  0x81: "Channel Search Sharing",

  0xC7: "Set USB Descriptor String",

  // Test mode

  0x53: "Init CW Test Mode",

  0x48: "CW Test Mode",

  // Data messages

  0x4E: "Broadcast Data",

  0x4F: "Acknowledged Data",

  0x50: "Burst Transfer Data",
  0x5F: "Extended Burst Data",
  0x72: "Advanced Burst Transfer Data",

};
}

 // Every raw ANT message starts with SYNC



 // SYNC+LENGTH+ID





 // Index of sync byte within message






// Get sequence nr. of burst 3 msb of channel byte

/*
This function create a raw message
 SYNC = 10100100 = 0xA4 or 10100101 (MSB:LSB)
 CRC = XOR of all bytes in message
 Sending of LSB first = little endian NB!
*/

// CheckSUM = XOR of all bytes in message

// ANT message ID - from sec 9.3 ANT Message Summary ANT Message Protocol And Usage Rev 50

// Config







































// DATA











export default Message;
