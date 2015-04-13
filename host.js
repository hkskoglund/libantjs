/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

/*jshint -W097 */
'use strict';

var EventEmitter = require('events'),

  // Data

  BroadcastDataMessage = require('./messages/data/BroadcastDataMessage'),
  AcknowledgedDataMessage = require('./messages/data/AcknowledgedDataMessage'),
  BurstDataMessage = require('./messages/data/BurstDataMessage'),
  AdvancedBurstDataMessage = require('./messages/data/AdvancedBurstDataMessage'),

  Logger = require('./util/logger'),
  Concat = require('./util/concat'),
  USBDevice = require('./usb/USBDevice'),
  Channel = require('./channel/channel'),
  Message = require('./messages/Message'),

  // Control ANT

  ResetSystemMessage = require('./messages/control/ResetSystemMessage'),
  OpenChannelMessage = require('./messages/control/OpenChannelMessage'),
  OpenRxScanModeMessage = require('./messages/control/OpenRxScanModeMessage'),
  CloseChannelMessage = require('./messages/control/CloseChannelMessage'),
  RequestMessage = require('./messages/control/RequestMessage'),

  // Notifications

  NotificationStartup = require('./messages/notification/NotificationStartup'),
  NotificationSerialError = require('./messages/notification/NotificationSerialError'),

  // Requested response

  CapabilitiesMessage = require('./messages/requestedResponse/CapabilitiesMessage'),
  VersionMessage = require('./messages/requestedResponse/VersionMessage'),
  DeviceSerialNumberMessage = require('./messages/requestedResponse/DeviceSerialNumberMessage'),
  ChannelStatusMessage = require('./messages/requestedResponse/ChannelStatusMessage'),
  ChannelIdMessage = require('./messages/requestedResponse/ChannelIdMessage'),
  AdvancedBurstCapabilitiesMessage = require('./messages/requestedResponse/AdvancedBurstCapabilitiesMessage'),
  AdvancedBurstCurrentConfigurationMessage = require('./messages/requestedResponse/AdvancedBurstCurrentConfigurationMessage'),

  // Configuration

  UnAssignChannelMessage = require('./messages/configuration/UnAssignChannelMessage'),
  AssignChannelMessage = require('./messages/configuration/AssignChannelMessage'),
  SetChannelIDMessage = require('./messages/configuration/SetChannelIDMessage'),
  SetChannelPeriodMessage = require('./messages/configuration/SetChannelPeriodMessage'),
  SetChannelSearchTimeoutMessage = require('./messages/configuration/SetChannelSearchTimeoutMessage'),
  SetLowPriorityChannelSearchTimeoutMessage = require('./messages/configuration/SetLowPriorityChannelSearchTimeoutMessage'),
  SetChannelRFFreqMessage = require('./messages/configuration/SetChannelRFFreqMessage'),
  SetNetworkKeyMessage = require('./messages/configuration/SetNetworkKeyMessage'),
  SetTransmitPowerMessage = require('./messages/configuration/SetTransmitPowerMessage'),
  SetChannelTxPowerMessage = require('./messages/configuration/SetChannelTxPowerMessage'),
  SetSearchWaveformMessage = require('./messages/configuration/SetSearchWaveformMessage'),
  SetProximitySearchMessage = require('./messages/configuration/SetProximitySearchMessage'),
  SetSerialNumChannelIdMessage = require('./messages/configuration/SetSerialNumChannelIdMessage'),
  ConfigureEventBufferMessage = require('./messages/configuration/ConfigureEventBufferMessage'),
  LibConfigMessage = require('./messages/configuration/LibConfigMessage'),
  ConfigureAdvancedBurstMessage = require('./messages/configuration/ConfigureAdvancedBurstMessage'),

  ChannelResponseMessage = require('./messages/ChannelResponseEvent/ChannelResponseMessage'),
  ChannelResponseEvent = require('./channel/channelResponseEvent'),

  ChannelId = require('./channel/channelId'),

  // Profiles

  RxScanModeProfile = require('./profiles/RxScanMode'),
  ANTFSHost = require('./profiles/antfs/host'),

  // USB hosts

  USBNode = require('./usb/USBNode.js');

function Host(options) {

  var channel;

  if (!options) {
    options = {};
  }

  options.logSource = this;

  this.options = options;

  this.log = new Logger(options);

  this.channel = new Array(Host.prototype.MAX_CHAN);

  for (channel = 0; channel < Host.prototype.MAX_CHAN; channel++) {
    this.channel[channel] = new Channel(this.options, this, channel);
  }

  if (this.isNode())
    this.usb = new USBNode({
      log: options.log,
      debugLevel: options.debugLevel
    });
  else
    if (this.log.logging)
      this.log.log('error','No USB host available');

}

Host.prototype = Object.create(EventEmitter.prototype);
Host.prototype.constuctor = Host;

Host.prototype.isNode = function() {
  return typeof process !== 'undefined' && (process.title.indexOf('node') !== -1 || process.title.indexOf('iojs') !== -1);
};

Host.prototype.MAX_CHAN = 8;

Host.prototype.ADVANCED_BURST = {
  ENABLE: 0x01,
  DISABLE: 0x02,
  MAX_PACKET_8BYTES: 0x01,
  MAX_PACKET_16BYTES: 0x02,
  MAX_PACKET_24BYTES: 0x03
};

// Send a message to ANT
Host.prototype.sendMessage = function(message, event, channel, callback) {

  var msgBytes,
    messageStr,

    onSentToANT = function _onSentToANT(error, msg) {

      if (error) {

        if (this.log.logging) {
          this.log.log('error', 'TX failed of ' + messageStr, error);
        }

        if (event)
          this.removeListener(event, callback);

        callback(error, msg);

      }

      if (!event) { // i.e send acknowledged data
        callback(error, msg);
      }


    }.bind(this);

  if (event) {

    if (typeof channel !== 'number') {

      this.once(event, callback);

      if (this.log.logging)
        this.log.log('log', 'Waiting for ' + event + ' - host');

    } else {

      this.channel[channel].once(event + '_0x' + message.id.toString(16), callback);

      if (this.log.logging)
        this.log.log('log', 'Waiting for ' + event + '_0x' + message.id.toString(16) + ' channel ' + channel);
    }

  }

  messageStr = message.toString();

  if (this.log.logging) {
    this.log.log('log', 'Sending ' + messageStr);
  }

  msgBytes = message.serialize();

  this.usb.transfer(msgBytes, onSentToANT);
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

Host.prototype.connectANTFS = function (channel,net,deviceNumber, hostname, download, erase, ls, onSearching)
{

  var antfsHost = new ANTFSHost({
    log : this.options.log
  },this,channel,net, deviceNumber, hostname, download, erase,ls);

  this.setChannel(antfsHost);
  antfsHost.connect(onSearching);
};

Host.prototype.setChannel = function(channel) {
  this.channel[channel.channel] = channel;
};

Host.prototype.getDevices = function() {
  return this.usb.getDevices();

};

Host.prototype.listDevices = function ()
{
  var str = '';

  this.usb.getDevices().forEach (function (device,index) { str += index + ' ' + this.usb.deviceToString(device) + '\n'; }.bind(this));

  return str;
};

Host.prototype.init = function(iDevice, onInit) {

  var onUSBinit = function(onInit, error) {

    if (error) {
      onInit(error);
    } else {

      this.usb.on(USBDevice.prototype.EVENT.DATA, this.deserialize.bind(this));

      this.usb.listen();

      this.resetSystem(onInit);

    }
  }.bind(this);

  /*
            this.libConfig(libConfig.getFlagsByte(),
                function _libConfig(error, channelResponse)
{
                    if (!error)
{

                        if (this.log.logging)
                            this.log.log('log', libConfig.toString());
                        _doLibConfigCB();
                    }
                    else
                        _doLibConfigCB(error);
                }.bind(this)); */



  this.usb.init(iDevice, onUSBinit.bind(this, onInit));

};

Host.prototype.exit = function(callback) {

  // TO DO? Close open channels? Exit channels/profiles?

  this.resetSystem(function _onReset(err, notificationStartup) {

    for (var c = 0; c < Host.prototype.MAX_CHAN; c++) {
      this.channel[c].removeAllListeners();
    }

    this.usb.exit(function _onUSBexit() {

      this.removeAllListeners();
      callback();

    }.bind(this));

  }.bind(this));

};

Host.prototype.resetSystem = function(callback) {

  var onNotificationStartup = function _onNotificationStartup(err, notificationStartup) {
    var DELAY = 500;
    if (this.log.logging)
      this.log.log('log', 'Waiting ' + DELAY + ' ms after reset system (for post-reset device state)');
    setTimeout(callback.bind(this, err, notificationStartup), DELAY);
  }.bind(this);

  this.sendMessage(new ResetSystemMessage(), Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_STARTUP], undefined, onNotificationStartup);
};

Host.prototype.getChannelId = function(channel, callback) {

  this.sendMessage(new RequestMessage(channel, Message.prototype.SET_CHANNEL_ID), Message.prototype.MESSAGE[Message.prototype.SET_CHANNEL_ID], undefined, callback);
};

Host.prototype.getVersion = function(callback) {

  this.sendMessage(new RequestMessage(undefined, Message.prototype.ANT_VERSION), Message.prototype.MESSAGE[Message.prototype.ANT_VERSION], undefined, callback);
};

Host.prototype.getCapabilities = function(callback) {

  this.sendMessage(new RequestMessage(undefined, Message.prototype.CAPABILITIES), Message.prototype.MESSAGE[Message.prototype.CAPABILITIES], undefined, callback);
};

Host.prototype.getAdvancedBurstCapabilities = function(callback) {

  this.sendMessage(new RequestMessage(0x00, Message.prototype.ADVANCED_BURST_CAPABILITIES), Message.prototype.MESSAGE[Message.prototype.ADVANCED_BURST_CAPABILITIES], undefined, callback);
};

Host.prototype.getAdvancedBurstConfiguration = function(callback) {

  this.sendMessage(new RequestMessage(0x01, Message.prototype.ADVANCED_BURST_CAPABILITIES), Message.prototype.MESSAGE[Message.prototype.ADVANCED_BURST_CAPABILITIES], undefined, callback);
};

// For convenience
Host.prototype.enableAdvancedBurst = function(maxPacketLength, callback) {

  var cb = callback,
    packetLength;


  if (typeof maxPacketLength === 'function') {
    cb = maxPacketLength;
    packetLength = this.ADVANCED_BURST.MAX_PACKET_24BYTES;
  } else {
    packetLength = maxPacketLength;
  }

  this.configAdvancedBurst(this.ADVANCED_BURST.ENABLE, packetLength, 0, 0, cb);
};

Host.prototype.disableAdvancedBurst = function(callback) {
  this.configAdvancedBurst(this.ADVANCED_BURST.DISABLE, this.ADVANCED_BURST.MAX_PACKET_24BYTES, 0, 0, callback);
};

Host.prototype.configAdvancedBurst = function(enable, maxPacketLength, requiredFeatures, optionalFeatures, stallCount, retryCount, callback) {
  var cb = callback;

  if (typeof stallCount === 'function')
    cb = stallCount;

  this.sendMessage(new ConfigureAdvancedBurstMessage(enable, maxPacketLength, requiredFeatures, optionalFeatures, stallCount, retryCount), undefined, undefined, cb);
};

Host.prototype.getSerialNumber = function(callback) {

  this.sendMessage(new RequestMessage(undefined, Message.prototype.DEVICE_SERIAL_NUMBER), Message.prototype.MESSAGE[Message.prototype.DEVICE_SERIAL_NUMBER], undefined, callback);
};

Host.prototype.configEventBuffer = function(config, size, time, callback) {
  this.sendMessage(new ConfigureEventBufferMessage(config, size, time), undefined, undefined, callback);
};

Host.prototype.getEventBufferConfiguration = function(callback) {

  this.sendMessage(new RequestMessage(undefined, Message.prototype.EVENT_BUFFER_CONFIGURATION), Message.prototype.MESSAGE[Message.prototype.EVENT_BUFFER_CONFIGURATION], undefined, callback);
};

Host.prototype.getChannelStatus = function(channel, callback) {

  this.sendMessage(new RequestMessage(channel, Message.prototype.CHANNEL_STATUS), Message.prototype.MESSAGE[Message.prototype.CHANNEL_STATUS], channel, callback);
};

// Spec p. 75 "If supported, when this setting is enabled ANT will include the channel ID, RSSI, or timestamp data with the messages"
// 0 - Disabled, 0x20 = Enable RX timestamp output, 0x40 - Enable RSSI output, 0x80 - Enabled Channel ID output
Host.prototype.libConfig = function(libConfig, callback) {

  this.sendMessage(new LibConfigMessage(libConfig), this.EVENT.OK, 0, callback);
};

// Unassign a channel. A channel must be unassigned before it may be reassigned. (spec p. 63)
Host.prototype.unAssignChannel = function(channel, callback) {

  this.sendMessage(new UnAssignChannelMessage(channel), this.EVENT.OK, channel, callback);
};

/* Reserves channel number and assigns channel type and network number to the channel, sets all other configuration parameters
   to defaults. Assign channel command should be issued before any other channel configuration messages
   (p. 64 ANT Message Protocol And Usaga Rev 50) -> also sets defaults values for RF, period, tx power, search timeout p.22 */
Host.prototype.assignChannel = function(channel, channelType, networkNumber, extendedAssignment, callback) {
  var cb,
    configurationMsg;

  if (typeof extendedAssignment === "function") {
    cb = extendedAssignment; // If no extended assignment use argument as callback
    configurationMsg = new AssignChannelMessage(channel, channelType, networkNumber);
  } else {
    cb = callback;
    configurationMsg = new AssignChannelMessage(channel, channelType, networkNumber, extendedAssignment);
  }

  this.sendMessage(configurationMsg, this.EVENT.OK, channel, cb);

};

/* Master: id transmitted along with messages Slave: sets channel ID to match the master it wishes to find,
 0 = wildcard "When the device number is fully known the pairing bit is ignored" (spec. p. 65)
*/
Host.prototype.setChannelId = function(channel, deviceNum, deviceType, transmissionType, callback) {

  this.sendMessage(new SetChannelIDMessage(channel, deviceNum, deviceType, transmissionType), this.EVENT.OK, channel, callback);
};

// Uses the lower 2 bytes of the device serial number as channel Id.
Host.prototype.setSerialNumChannelId = function(channel, deviceType, transmissionType, callback) {

  this.sendMessage(new SetSerialNumChannelIdMessage(channel, deviceType, transmissionType), this.EVENT.OK, channel, callback);
};

Host.prototype.setChannelPeriod = function(channel, messagePeriod, callback) {

  this.sendMessage(new SetChannelPeriodMessage(channel, messagePeriod), this.EVENT.OK, channel, callback);
};

// Low priority search mode
// Spec. p. 72 : "...a low priority search will not interrupt other open channels on the device while searching",
// "If the low priority search times out, the module will switch to high priority mode"
Host.prototype.setLowPriorityChannelSearchTimeout = function(channel, searchTimeout, callback) {
  // Timeout in sec. : ucSearchTimeout * 2.5 s, 255 = infinite, 0 = disable low priority search

  this.sendMessage(new SetLowPriorityChannelSearchTimeoutMessage(channel, searchTimeout), this.EVENT.OK, channel, callback);
};

// Set High priority search timeout, each count in searchTimeout = 2.5 s, 255 = infinite,
//0 = disable high priority search mode (default search timeout is 25 seconds)
Host.prototype.setChannelSearchTimeout = function(channel, searchTimeout, callback) {

  this.sendMessage(new SetChannelSearchTimeoutMessage(channel, searchTimeout), this.EVENT.OK, channel, callback);
};

// Set the RF frequency, i.e 66 = 2466 MHz
Host.prototype.setChannelRFFreq = function(channel, RFFreq, callback) {

  this.sendMessage(new SetChannelRFFreqMessage(channel, RFFreq), this.EVENT.OK, channel, callback);
};

// Set network key for specific net
Host.prototype.setNetworkKey = function(netNumber, key, callback) {

  this.sendMessage(new SetNetworkKeyMessage(netNumber, key), this.EVENT.OK, 0, callback);
};

// Set search waveform individual channel
Host.prototype.setSearchWaveform = function(channel, searchWaveform, callback) {

  this.sendMessage(new SetSearchWaveformMessage(channel, searchWaveform), this.EVENT.OK, channel, callback);
};

// Set transmit power for all channels
Host.prototype.setTransmitPower = function(transmitPower, callback) {

  this.sendMessage(new SetTransmitPowerMessage(transmitPower), this.EVENT.OK, 0, callback);
};

// Set transmit power for individual channel
Host.prototype.setChannelTxPower = function(channel, transmitPower, callback) {

  this.sendMessage(new SetChannelTxPowerMessage(channel, transmitPower), this.EVENT.OK, channel, callback);
};

// "Enabled a one-time proximity requirement for searching. Once a proximity searh has been successful, this threshold value will be cleared" (spec. p. 76)
Host.prototype.setProximitySearch = function(channel, searchThreshold, callback) {

  this.sendMessage(new SetProximitySearchMessage(channel, searchThreshold), this.EVENT.OK, channel, callback);
};

Host.prototype.openRxScanMode = function(channel, callback) {

  this.sendMessage(new OpenRxScanModeMessage(channel), this.EVENT.OK, channel, callback);
};

// Opens a previously assigned and configured channel. Data messages or events begins to be issued. (spec p. 88)
Host.prototype.openChannel = function(channel, callback) {

  this.sendMessage(new OpenChannelMessage(channel), this.EVENT.OK, channel, callback);
};

// Close a channel that has been previously opened. Channel still remains assigned and can be reopened at any time. (spec. p 88)
Host.prototype.closeChannel = function(channel, callback) {

  // Wait for EVENT_CHANNEL_CLOSED ?
  // If channel status is tracking -> can get broadcast data packet before event channel closed packet

  this.sendMessage(new CloseChannelMessage(channel), this.EVENT.OK, channel, callback);

};

Host.prototype.sendBroadcastData = function(channel, broadcastData, callback, acknowledge) {
  var data = broadcastData,
    msg;

  if (!acknowledge)
    msg = new BroadcastDataMessage();
  else
    msg = new AcknowledgedDataMessage();

  if (typeof broadcastData === 'object' && broadcastData.constructor.name === 'Array') // Allows sending of [1,2,3,4,5,6,7,8]
    data = new Uint8Array(broadcastData);

  msg.encode(channel, data);

  this.sendMessage(msg, undefined, channel, callback);
};

// p. 96 ANT Message protocol and usave rev. 5.0
// Event TRANSFER_TX_COMPLETED channel event if successfull,
// Event TRANSFER_TX_FAILED -> msg. failed to reach master or response from master failed to reach the slave -> slave may retry
// Event GO_TO_SEARCH is received if channel is dropped -> channel should be unassigned
Host.prototype.sendAcknowledgedData = function(channel, acknowledgedData, callback) {

  var retry = 0,
    MAX_RETRIES = 3,

    onSentToANT = function _onSentToANT(err,msg)
    {
      if (err)
        {
          this.channel[channel].removeListener(this.EVENT.FAILED, onTxFailed);
          this.channel[channel].removeListener(this.EVENT.COMPLETED, onTxCompleted);

          callback(err,msg);
        }

    }.bind(this),

    onTxCompleted = function _onTxCompleted(RFevent) {

      this.channel[channel].removeListener(this.EVENT.FAILED, onTxFailed);

      callback(undefined, RFevent);

    }.bind(this),

    onTxFailed = function _onTxFailed(RFevent) {

      retry++;

      if (retry <= MAX_RETRIES) {

        this.sendBroadcastData(channel, acknowledgedData, onSentToANT, true);

      } else {

        this.channel[channel].removeListener(this.EVENT.COMPLETED, onTxCompleted);

        callback(RFevent, undefined);
      }
    }.bind(this);

  this.channel[channel].once(this.EVENT.FAILED, onTxFailed);
  this.channel[channel].once(this.EVENT.COMPLETED, onTxCompleted);

  this.sendBroadcastData(channel, acknowledgedData, onSentToANT, true);

};

// Send an individual packet as part of a burst transfer
Host.prototype.sendBurstTransferPacket = function(sequenceChannel, packet, callback) {
  var msg;

  if (packet.byteLength === Message.prototype.PAYLOAD_LENGTH) // Use ordinary burst if only 8-byte packets
  {
    msg = new BurstDataMessage();
  } else {
    msg = new AdvancedBurstDataMessage();
  }

  msg.encode(sequenceChannel, packet);

  // TEST FAIL this.channel[0].emit('EVENT_TRANSFER_TX_FAILED',undefined,'EVENT_TRANSFER_TX_FAILED');
  // TEST FAIL callback(undefined,'test');
  this.sendMessage(msg, undefined, undefined, callback);
};

// Sends bulk data
// EVENT_TRANSFER_TX_START - next channel period after message sent to device
// EVENT_TRANSFER_TX_COMPLETED
// EVENT_TRANSFER_TX_FAILED : After 5 retries
Host.prototype.sendBurstTransfer = function(channel, data, packetsPerURB, callback) {
  var cb,
    numberOfPackets,
    packetLength,
    packetNr = 0,
    sequenceNr = 0,
    sequenceChannel, // 7:5 bits = sequence nr (000 = first packet, 7 bit high on last packet) - transfer integrity, 0:4 bits channel nr
    packet,
    tmpPacket,
    burstResponseTimeout,

    sendPacket = function() {

      if (sequenceNr > 3) // Roll over sequence nr
        sequenceNr = 1;

      if (packetNr === (numberOfPackets - 1)) {
        sequenceNr = sequenceNr | 0x04; // Set most significant bit high for last packet, i.e sequenceNr 000 -> 100

        burstResponseTimeout = setTimeout(function _onBurstResponseTimeout() {
          if (this.log.logging)
            this.log.log('error', 'Has not received TX_COMPLETED/TX_FAILED for burst');
          removeListeners();
          callback(new Error('Has not received TX_COMPLETED/TX_FAILED for burst'));
        }.bind(this), 2000);
      }

      packet = data.subarray(packetNr * packetLength, (packetNr + 1) * packetLength);

      // Fill with 0 for last packet if necessary

      if (packet.byteLength < packetLength) {
        tmpPacket = new Uint8Array(packetLength);
        tmpPacket.set(packet);
        packet = tmpPacket;
      }

      sequenceChannel = (sequenceNr << 5) | channel;

      this.sendBurstTransferPacket(sequenceChannel, packet, function _sendBurstTransferPacket(err, msg) {

        if (!err) {

          sequenceNr++;
          packetNr++;

          if (packetNr < numberOfPackets)
            sendPacket();
          // else (call callback on TX_COMPLETED/FAILED)
        } else {

          clearTimeout(burstResponseTimeout);

          removeListeners();

          cb(err);
        }

      });
    }.bind(this),

    addListeners = function() {
      this.channel[channel].on('EVENT_TRANSFER_TX_COMPLETED', onTxCompleted);
      this.channel[channel].on('EVENT_TRANSFER_TX_FAILED', onTxFailed);
      this.channel[channel].on('EVENT_TRANSFER_TX_START', onTxStart);

    }.bind(this),

    removeListeners = function() {
      this.channel[channel].removeListener('EVENT_TRANSFER_TX_COMPLETED', onTxCompleted);
      this.channel[channel].removeListener('EVENT_TRANSFER_TX_FAILED', onTxFailed);
      this.channel[channel].removeListener('EVENT_TRANSFER_TX_START', onTxStart);
    }.bind(this),

    onTxCompleted = function(err, msg) {
      //console.timeEnd('TXCOMPLETED');
      clearTimeout(burstResponseTimeout);
      removeListeners();
      cb(undefined, msg);
    },

    onTxStart = function(err, msg) {
      //console.time('TXCOMPLETED');
    },

    onTxFailed = function(err, msg) {

      clearTimeout(burstResponseTimeout);

      removeListeners();
      cb(msg, undefined); // error msg should be EVENT_TRANSFER_TX_FAILED


    }.bind(this);

  addListeners();

  if (typeof data === 'object' && data.constructor.name === 'Array') // Allows sending of Array [1,2,3,4,5,6,7,8,...]
    data = new Uint8Array(data);

  if (typeof packetsPerURB === 'function') // Standard burst
  {
    packetLength = Message.prototype.PAYLOAD_LENGTH;
    cb = packetsPerURB;
  } else {

    packetLength = Message.prototype.PAYLOAD_LENGTH * packetsPerURB;
    cb = callback;
  }

  numberOfPackets = Math.ceil(data.byteLength / packetLength);

  if (this.log.logging)
    this.log.log('log', 'Sending burst, ' + numberOfPackets + ' packets, packet length ' + packetLength + ' channel ' + channel + ' ' + data.byteLength + ' bytes ');

  sendPacket();

};

// For compability with spec. interface 9.5.5.4 Advanced Burst Data 0x72
Host.prototype.sendAdvancedTransfer = function(channel, data, size, packetsPerURB, callback) {
  // Note size ignored/not necessary
  this.sendBurstTransfer(channel, data, packetsPerURB, callback);
};

Host.prototype.deserialize = function(data) {
  var msgBytes,
    iEndOfMessage,
    iStartOfMessage = 0,
    metaDataLength = Message.prototype.HEADER_LENGTH + Message.prototype.CRC_LENGTH,
    message,
    bufferUtil = new Concat(),
    event;

  if (this.previousPacket && this.previousPacket.byteLength)
  // Holds the rest of the ANT message when receiving more data than the requested in endpoint packet size
  {
    data = bufferUtil.concat(this.previousPacket, data);
  }

  iEndOfMessage = data[Message.prototype.iLENGTH] + metaDataLength;

  while (iStartOfMessage < iEndOfMessage) {

    msgBytes = data.subarray(iStartOfMessage, iEndOfMessage);

    if (msgBytes[Message.prototype.iSYNC] !== Message.prototype.SYNC) {

      if (this.log.logging) this.log.log('error', 'Invalid SYNC ' + msgBytes[Message.prototype.iSYNC] +
        ', discarding ' + data.length + ' bytes', data);

      return;
    }

    message = undefined;

    switch (msgBytes[Message.prototype.iID]) {

      // Notifications

      case Message.prototype.NOTIFICATION_STARTUP:

        message = new NotificationStartup(msgBytes);
        this.emit(Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_STARTUP], undefined, message);

        break;

      case Message.prototype.NOTIFICATION_SERIAL_ERROR:

        message = new NotificationSerialError(msgBytes);
        this.emit(Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_SERIAL_ERROR], undefined, message);

        break;

        // Requested response

      case Message.prototype.CHANNEL_STATUS:

        message = new ChannelStatusMessage(msgBytes);
        this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], undefined, message);

        break;

      case Message.prototype.ANT_VERSION:

        message = new VersionMessage(msgBytes);

        this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], undefined, message);

        break;

      case Message.prototype.CAPABILITIES:

        message = new CapabilitiesMessage(msgBytes);
        this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], undefined, message);

        break;

      case Message.prototype.DEVICE_SERIAL_NUMBER:

        message = new DeviceSerialNumberMessage(msgBytes);
        this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], undefined, message);

        break;

      case Message.prototype.EVENT_BUFFER_CONFIGURATION:

        message = new ConfigureEventBufferMessage(msgBytes);
        this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], undefined, message);

        break;

      case Message.prototype.ADVANCED_BURST_CAPABILITIES:

        switch (msgBytes[Message.prototype.iLENGTH]) {

          case 0x04:

            message = new AdvancedBurstCapabilitiesMessage(msgBytes);
            break;

          case 0x0A:

            message = new AdvancedBurstCurrentConfigurationMessage(msgBytes);
            break;
        }

        this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], undefined, message);

        break;

      case Message.prototype.SET_CHANNEL_ID:

        message = new ChannelIdMessage(msgBytes);
        this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], undefined, message);

        break;

        // Data

      case Message.prototype.BROADCAST_DATA:

        message = new BroadcastDataMessage(msgBytes);
        this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.BROADCAST_DATA], message);

        break;

      case Message.prototype.ACKNOWLEDGED_DATA:

        message = new AcknowledgedDataMessage(msgBytes);
        this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.ACKNOWLEDGED_DATA], message);

        break;

      case Message.prototype.BURST_TRANSFER_DATA:

        message = new BurstDataMessage(msgBytes);
        this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.BURST_TRANSFER_DATA], message);

        if (message.sequenceNr === 0) // First packet (also for advanced burst)
          this.channel[message.channel].burst = new Uint8Array();

        this.channel[message.channel].burst = bufferUtil.concat(this.channel[message.channel].burst, message.packet);

        if (message.sequenceNr & 0x04) // Last packet
          this.channel[message.channel].emit(Channel.prototype.EVENT.BURST, this.channel[message.channel].burst);

        break;

      case Message.prototype.ADVANCED_BURST_TRANSFER_DATA:

        message = new AdvancedBurstDataMessage(msgBytes);
        this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.BURST_TRANSFER_DATA], message);

        this.channel[message.channel].burst = bufferUtil.concat(this.channel[message.channel].burst, message.packet);

        if (message.sequenceNr & 0x04) // Last packet
          this.channel[message.channel].emit(Channel.prototype.EVENT.BURST, message);

        break;

      // Channel responses or RF event

      case Message.prototype.CHANNEL_RESPONSE:

        message = new ChannelResponseMessage(msgBytes);

        if (!message.isRFevent())
          event = ChannelResponseEvent.prototype.MESSAGE[message.response.code] + '_0x' + message.response.initiatingId.toString(16);
        else
          event = ChannelResponseEvent.prototype.MESSAGE[message.response.code];

      /*  if (this.log.logging) {
          this.log.log('log','Emitting event ' + event + ' channel ' + message.response.channel);
        //  this.log.log('log','Event handlers channel ' + message.response.channel,this.channel[message.response.channel]._events);
      } */

        this.channel[message.response.channel].emit(event, undefined, message.response);

        break;

      default:

        message = 'Unable to parse received msg id ' + msgBytes[Message.prototype.iID];
        this.emit(this.EVENT.ERROR, message);

        break;
    }

    if (message)
      if (this.log.logging)
        this.log.log('log', message.toString());

    iStartOfMessage = iEndOfMessage;

    if (iStartOfMessage + data[iStartOfMessage + Message.prototype.iLENGTH] + metaDataLength <= data.byteLength) {
      iEndOfMessage += (data[iStartOfMessage + Message.prototype.iLENGTH] + metaDataLength);
    } else {
      this.previousPacket = data.subarray(iStartOfMessage);

      iEndOfMessage = iStartOfMessage;
    }

  }
};

module.exports = Host;
return module.exports;
