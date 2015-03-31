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

  usb, // Don't expose usb interface to higher level code, use wrappers instead on host

  MAX_CHAN = 8,
  previousPacket;

// Host for USB ANT communication

function Host(options) {

  var channel;

  if (!options) {
    options = {};
  }

  options.logSource = this;

  this.options = options;

  this.log = new Logger(options);

  this.channel = new Array(MAX_CHAN);

  for (channel = 0; channel < MAX_CHAN; channel++) {
    this.channel[channel] = new Channel(this.options, this, channel);
  }

  usb = new (options.usb)({
    log: options.log,
    debugLevel: options.debugLevel
  });

}

Host.prototype = Object.create(EventEmitter.prototype, {
  constructor: {
    value: Host,
    enumerable: false,
    writeable: true,
    configurable: true
  }
});

Host.prototype.ADVANCED_BURST = {
  ENABLE: 0x01,
  DISABLE: 0x02,
  MAX_PACKET_8BYTES: 0x01,
  MAX_PACKET_16BYTES: 0x02,
  MAX_PACKET_24BYTES: 0x03
};

// Send a message to ANT
Host.prototype.sendMessage = function(message, callback) {

  var msgBytes,
    messageStr,

    onSentToANT = function _onSentToANT(error, msg) {

      if (error) {

        if (this.log.logging) {
          this.log.log('error', 'TX failed of ' + messageStr, error);
        }

      }

      callback(error, msg);


    }.bind(this);

  messageStr = message.toString();

  if (this.log.logging) {
    this.log.log('log', 'Sending ' + messageStr);
  }

  msgBytes = message.serialize();

  usb.transfer(msgBytes, onSentToANT);
};

Host.prototype.EVENT = {

  ERROR: 'error', // For example notification serial error

  // Data

  //BROADCAST: 'broadcast',
  BURST: 'burst', // Total burst , i.e all burst packets are received

  FAILED: 'EVENT_TRANSFER_TX_FAILED',
  COMPLETED: 'EVENT_TRANSFER_TX_COMPLETED',

  OK: 'RESPONSE_NO_ERROR'

};

Host.prototype.setChannel = function(channel) {
  this.channel[channel.channel] = channel;
};

Host.prototype.getDevices = function() {
  return usb.getDevices();

};

Host.prototype.init = function(iDevice, onInit) {

  var onUSBinit = function(onInit, error) {

    if (error) {
      onInit(error);
    } else {

      usb.addListener(USBDevice.prototype.EVENT.DATA, this.deserialize.bind(this));

      usb.listen();

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



  usb.init(iDevice, onUSBinit.bind(this, onInit));

};

Host.prototype.exit = function(callback) {

  // TO DO? Close open channels? Exit channels/profiles?

  for (var ch = 0; ch < MAX_CHAN; ch++) {
    this.channel[ch].removeAllListeners();
  }

  usb.exit(function() {
    this.removeAllListeners();
    callback();
  }.bind(this));

};

Host.prototype.resetSystem = function(callback) {

  var onNotificationStartup = function _onNotificationStartup(msg) {
    setTimeout(callback.bind(this, undefined, msg), 500);

  }.bind(this);

  this.once(Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_STARTUP], onNotificationStartup);

  this.sendMessage(new ResetSystemMessage(), function _onResetSent(err, msg) {
    if (err) {
      this.removeListener(Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_STARTUP], onNotificationStartup);
      callback(err, msg);
    }

    // else callback should be called in onNotificationStartup
  });
};

Host.prototype.getChannelId = function(channel, callback) {

  this.once(Message.prototype.MESSAGE[Message.prototype.SET_CHANNEL_ID], callback);

  this.sendMessage(new RequestMessage(channel, Message.prototype.SET_CHANNEL_ID), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

Host.prototype.getVersion = function(callback) {

  this.once(Message.prototype.MESSAGE[Message.prototype.ANT_VERSION], callback);

  this.sendMessage(new RequestMessage(undefined, Message.prototype.ANT_VERSION), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

Host.prototype.getCapabilities = function(callback) {

  this.once(Message.prototype.MESSAGE[Message.prototype.CAPABILITIES], callback);

  this.sendMessage(new RequestMessage(undefined, Message.prototype.CAPABILITIES), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

Host.prototype.getAdvancedBurstCapabilities = function(callback) {

  this.once(Message.prototype.MESSAGE[Message.prototype.ADVANCED_BURST_CAPABILITIES], callback);

  this.sendMessage(new RequestMessage(0x00, Message.prototype.ADVANCED_BURST_CAPABILITIES), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

Host.prototype.getAdvancedBurstConfiguration = function(callback) {

  this.once(Message.prototype.MESSAGE[Message.prototype.ADVANCED_BURST_CAPABILITIES], callback);

  this.sendMessage(new RequestMessage(0x01, Message.prototype.ADVANCED_BURST_CAPABILITIES), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
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

  this.sendMessage(new ConfigureAdvancedBurstMessage(enable, maxPacketLength, requiredFeatures, optionalFeatures, stallCount, retryCount), cb);
};

Host.prototype.getSerialNumber = function(callback) {
  this.once(Message.prototype.MESSAGE[Message.prototype.DEVICE_SERIAL_NUMBER], callback);
  this.sendMessage(new RequestMessage(undefined, Message.prototype.DEVICE_SERIAL_NUMBER), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

Host.prototype.configEventBuffer = function(config, size, time, callback) {
  this.sendMessage(new ConfigureEventBufferMessage(config, size, time), callback);
};

Host.prototype.getEventBufferConfiguration = function(callback) {
  this.once(Message.prototype.MESSAGE[Message.prototype.EVENT_BUFFER_CONFIGURATION], callback);
  this.sendMessage(new RequestMessage(undefined, Message.prototype.EVENT_BUFFER_CONFIGURATION), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

Host.prototype.getChannelStatus = function(channel, callback) {
  this.once(Message.prototype.MESSAGE[Message.prototype.CHANNEL_STATUS], callback);
  this.sendMessage(new RequestMessage(channel, Message.prototype.CHANNEL_STATUS), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Spec p. 75 "If supported, when this setting is enabled ANT will include the channel ID, RSSI, or timestamp data with the messages"
// 0 - Disabled, 0x20 = Enable RX timestamp output, 0x40 - Enable RSSI output, 0x80 - Enabled Channel ID output
Host.prototype.libConfig = function(libConfig, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new LibConfigMessage(libConfig), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Unassign a channel. A channel must be unassigned before it may be reassigned. (spec p. 63)
Host.prototype.unAssignChannel = function(channel, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new UnAssignChannelMessage(channel), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
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

  this.channel[channel].once(this.EVENT.OK, cb);

  this.sendMessage(configurationMsg, function _onSentToANT(err, msg) {
    if (err) cb(err, msg);
  });

};

/* Master: id transmitted along with messages Slave: sets channel ID to match the master it wishes to find,
 0 = wildcard "When the device number is fully known the pairing bit is ignored" (spec. p. 65)
*/
Host.prototype.setChannelId = function(channel, deviceNum, deviceType, transmissionType, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new SetChannelIDMessage(channel, deviceNum, deviceType, transmissionType), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Uses the lower 2 bytes of the device serial number as channel Id.
Host.prototype.setSerialNumChannelId = function(channel, deviceType, transmissionType, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new SetSerialNumChannelIdMessage(channel, deviceType, transmissionType), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

Host.prototype.setChannelPeriod = function(channel, messagePeriod, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new SetChannelPeriodMessage(channel, messagePeriod), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Low priority search mode
// Spec. p. 72 : "...a low priority search will not interrupt other open channels on the device while searching",
// "If the low priority search times out, the module will switch to high priority mode"
Host.prototype.setLowPriorityChannelSearchTimeout = function(channel, searchTimeout, callback) {
  // Timeout in sec. : ucSearchTimeout * 2.5 s, 255 = infinite, 0 = disable low priority search
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new SetLowPriorityChannelSearchTimeoutMessage(channel, searchTimeout), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Set High priority search timeout, each count in searchTimeout = 2.5 s, 255 = infinite,
//0 = disable high priority search mode (default search timeout is 25 seconds)
Host.prototype.setChannelSearchTimeout = function(channel, searchTimeout, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new SetChannelSearchTimeoutMessage(channel, searchTimeout), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Set the RF frequency, i.e 66 = 2466 MHz
Host.prototype.setChannelRFFreq = function(channel, RFFreq, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new SetChannelRFFreqMessage(channel, RFFreq), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Set network key for specific net
Host.prototype.setNetworkKey = function(netNumber, key, callback) {
  this.channel[0].once(this.EVENT.OK, callback);

  this.sendMessage(new SetNetworkKeyMessage(netNumber, key), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Set search waveform individual channel
Host.prototype.setSearchWaveform = function(channel, searchWaveform, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new SetSearchWaveformMessage(channel, searchWaveform), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Set transmit power for all channels
Host.prototype.setTransmitPower = function(transmitPower, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new SetTransmitPowerMessage(transmitPower), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Set transmit power for individual channel
Host.prototype.setChannelTxPower = function(channel, transmitPower, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new SetChannelTxPowerMessage(channel, transmitPower), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// "Enabled a one-time proximity requirement for searching. Once a proximity searh has been successful, this threshold value will be cleared" (spec. p. 76)
Host.prototype.setProximitySearch = function(channel, searchThreshold, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new SetProximitySearchMessage(channel, searchThreshold), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

Host.prototype.openRxScanMode = function(channel, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new OpenRxScanModeMessage(channel), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Opens a previously assigned and configured channel. Data messages or events begins to be issued. (spec p. 88)
Host.prototype.openChannel = function(channel, callback) {
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new OpenChannelMessage(channel), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });
};

// Close a channel that has been previously opened. Channel still remains assigned and can be reopened at any time. (spec. p 88)
Host.prototype.closeChannel = function(channelNumber, callback) {

  // Wait for EVENT_CHANNEL_CLOSED ?
  // If channel status is tracking -> can get broadcast data packet before event channel closed packet
  this.channel[channel].once(this.EVENT.OK, callback);
  this.sendMessage(new CloseChannelMessage(channelNumber), function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  });

};

Host.prototype.sendBroadcastData = function(channel, broadcastData, callback, ack) {
  var data = broadcastData,
    msg;

  if (!ack)
    msg = new BroadcastDataMessage();
  else
    msg = new AcknowledgedDataMessage();

  if (typeof broadcastData === 'object' && broadcastData.constructor.name === 'Array') // Allows sending of [1,2,3,4,5,6,7,8]
    data = new Uint8Array(broadcastData);

  msg.encode(channel, data);

  this.sendMessage(msg, callback);
};

// p. 96 ANT Message protocol and usave rev. 5.0
// Event TRANSFER_TX_COMPLETED channel event if successfull,
// Event TRANSFER_TX_FAILED -> msg. failed to reach master or response from master failed to reach the slave -> slave may retry
// Event GO_TO_SEARCH is received if channel is dropped -> channel should be unassigned
Host.prototype.sendAcknowledgedData = function(channel, ackData, callback) {

  var retry = 0,
    MAX_RETRIES = 3,

    onTxCompleted = function _onTxCompleted(RFevent) {

      this.channel[channel].removeListener(this.EVENT.FAILED, onTxFailed);

      callback(undefined, RFevent);

    }.bind(this),

    onTxFailed = function _onTxFailed(RFevent) {

      retry++;

      if (retry <= MAX_RETRIES) {

        this.sendBroadcastData(channel, ackData, callback, true);

      } else {

        this.channel[channel].removeListener(this.EVENT.COMPLETED, onTxCompleted);

        callback(RFevent, undefined);
      }
    }.bind(this);

  this.channel[channel].once(this.EVENT.FAILED, onTxFailed);
  this.channel[channel].once(this.EVENT.COMPLETED, onTxCompleted);

  this.sendBroadcastData(channel, ackData, function _onSentToANT(err, msg) {
    if (err) callback(err, msg);
  }, true);

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
  this.sendMessage(msg, callback);
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
    retryNr = 0,
    MAX_BURST_RETRIES = 3,
    burstResponseTimeout,

    sendPacket = function() {

      if (sequenceNr > 3) // Roll over sequence nr
        sequenceNr = 1;

      if (packetNr === (numberOfPackets - 1)) {
        sequenceNr = sequenceNr | 0x04; // Set most significant bit high for last packet, i.e sequenceNr 000 -> 100

        burstResponseTimeout = setTimeout(function _onBurstResponseTimeout() {
          if (this.log.logging)
            this.log.log('error', 'Has not received TX_COMPLETED/TX_FAILED for burst');
          removeEventListeners();
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
      //txFailed = true;

      retryNr++;

      if (retryNr <= MAX_BURST_RETRIES) {

        packetNr = 0;
        sequenceNr = 0;

        if (this.log.logging)
          this.log.log('log', 'Retry ' + retryNr + ' burst, ' + numberOfPackets + ' packets, packet length ' + packetLength + ' channel ' + channel + ' ' + data.byteLength + ' bytes ');

        sendPacket();

      } else {

        removeListeners();
        cb(msg, undefined); // error msg should be EVENT_TRANSFER_TX_FAILED

      }

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
    bufferUtil = new Concat();

  if (previousPacket && previousPacket.byteLength)
  // Holds the rest of the ANT message when receiving more data than the requested in endpoint packet size
  {
    data = bufferUtil.concat(previousPacket, data);
  }

  iEndOfMessage = data[Message.prototype.iLENGTH] + metaDataLength;

  while (iStartOfMessage < iEndOfMessage) {

    msgBytes = data.subarray(iStartOfMessage, iEndOfMessage);

    if (msgBytes[Message.prototype.iSYNC] !== Message.prototype.SYNC) {

      if (this.log.logging) this.log.log('error', 'Invalid SYNC ' + msgBytes[Message.prototype.iSYNC] +
        ', discarding ' + data.length + ' bytes', data);

      return;
    }

    switch (msgBytes[Message.prototype.iID]) {

      // Notifications

      case Message.prototype.NOTIFICATION_STARTUP:

        this.emit(Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_STARTUP], new NotificationStartup(msgBytes));

        break;

      case Message.prototype.NOTIFICATION_SERIAL_ERROR:

        message = new NotificationSerialError(msgBytes);
        this.emit(this.EVENT.ERROR, message);

        break;

        // Requested response

      case Message.prototype.CHANNEL_STATUS:

        message = new ChannelStatusMessage(msgBytes);
        this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], undefined, message);

        break;

      case Message.prototype.ANT_VERSION:

        message = new VersionMessage(msgBytes);

        if (this.log.logging)
          this.log.log('log', message.toString());

        this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], undefined, message);

        break;

      case Message.prototype.CAPABILITIES:

        message = new CapabilitiesMessage(msgBytes);

        if (this.log.logging)
          this.log.log('log', message.toString());

        this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], undefined, message);

        break;

      case Message.prototype.DEVICE_SERIAL_NUMBER:

        message = new DeviceSerialNumberMessage(msgBytes);

        if (this.log.logging)
          this.log.log('log', message.toString());

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

        var channelResponseMsg = new ChannelResponseMessage(msgBytes);

        if (this.log.logging)
          this.log.log('log', ChannelResponseEvent.prototype.MESSAGE[channelResponseMsg.response.code]);

        this.channel[channelResponseMsg.response.channel].emit(ChannelResponseEvent.prototype.MESSAGE[channelResponseMsg.response.code], undefined, channelResponseMsg.response);

        break;

      default:

        message = 'Unable to parse received msg id ' + msgBytes[Message.prototype.iID];

        if (this.log.logging)
          this.log.log('log', message, data);

        this.emit(this.EVENT.ERROR, message);

        break;
    }

    iStartOfMessage = iEndOfMessage;

    if (iStartOfMessage + data[iStartOfMessage + Message.prototype.iLENGTH] + metaDataLength <= data.byteLength) {
      iEndOfMessage += (data[iStartOfMessage + Message.prototype.iLENGTH] + metaDataLength);
    } else {
      previousPacket = data.subarray(iStartOfMessage);

      iEndOfMessage = iStartOfMessage;
    }

  }
};

module.exports = Host;
return module.exports;
