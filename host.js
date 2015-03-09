/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:truel, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

// Convention : _ before a function name indicates that the function should not be used externally

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var

    EventEmitter = require('./util/events'),

    // Data

    BroadcastDataMessage = require('./messages/data/BroadcastDataMessage'),
    AcknowledgedDataMessage = require('./messages/data/AcknowledgedDataMessage'),
    BurstDataMessage = require('./messages/data/BurstDataMessage'),

    Logger = require('./util/logger'),
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

    ChannelResponseMessage = require('./messages/ChannelResponseEvent/ChannelResponseMessage'),
    ChannelResponseEvent = require('./channel/channelResponseEvent'),

    ChannelId = require('./channel/channelId'),

    // Profiles

    RxScanModeProfile = require('./profiles/RxScanMode'),

    // Private objects

    // Don't expose usb interface to higher level code, use wrappers instead on host

    UsbLib,
    usb,
    usbLibraryPath,
    MAX_CHAN = 8,
    previousPacket,
    MAX_TRANSFER_PACKETS = 8, // Max 64 byte packets to prime ANT engine with
    burstBuffer = new Uint8Array(),
    iLastBurstTransfer = 0;
  // Detect host environment, i.e if running on node load node specific USB library

  // Node/iojs

  if (typeof process !== 'undefined' && process.title === 'node') {
    usbLibraryPath = './usb/USBNode';
  }

  // Chrome packaged app
  else if (typeof window !== 'undefined' && typeof window.chrome === 'object') {
    usbLibraryPath = './usb/USBChrome';
  }

  UsbLib = require(usbLibraryPath);

  // Host for USB ANT communication

  function Host(options) {

    var number;

    if (!options) {
      options = {};
    }

    options.logSource = this;

    this.options = options;

    this.log = new Logger(options);

    this.channel = new Array(MAX_CHAN);

    for (number = 0; number < MAX_CHAN; number++) {
      this.channel[number] = new Channel(this.options, this, number);
    }

    if (this.log.logging) {
      this.log.log('log', 'Loaded USB library from ' + usbLibraryPath);
    }
    usb = new UsbLib({
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


  // Send a message to ANT
  Host.prototype.sendMessage = function(message, callback) {
    var messageReceived = false,
      timeout = 500,
      intervalNoMessageReceivedID,
      retry = 0,
      MAX_TRIES = 3,
      msgBytes,
      errMsg,
      noReply,
      configMessage,
      requestMessage,
      resetMessage,
      openCloseMessage,
      messageStr,

      lastBurstPacket,

      onReply = function _onReply(error, message) {
        clearInterval(intervalNoMessageReceivedID);

        if (this.log.logging) this.log.log('log', message.toString());

        callback(error, message);

      }.bind(this),

      onSentMessage = function _onSentMessage(error) {
        if (error) {
          if (!noReply) clearInterval(intervalNoMessageReceivedID);
          if (this.log.logging) {
            this.log.log('error', 'TX failed of ' + message.toString(), error);
          }
          callback(error);
        } else {
          if (noReply)
            callback(error);
          // on success -> onReply should be called

        }

      }.bind(this),

      onNoMessageReceived = function _onNoMessageReceived() {
        retry++;

        if (this.log.logging) this.log.log('warn', 'No reply in ' + timeout + ' ms. Retry ' + retry + ' ' + messageStr);

        if (retry < MAX_TRIES) {
          usb.transfer(msgBytes, onSentMessage);
        } else {
          clearInterval(intervalNoMessageReceivedID);
          errMsg = 'Received no response after sending ' + messageStr + ' ' + retry + ' times';
          if (this.log.logging) this.log.log('error', errMsg);
          callback(new Error(errMsg));
        }
      }.bind(this);

    messageStr = message.toString();

    // Spec. p 54
    noReply = (Message.prototype.NO_REPLY_MESSAGE.indexOf(message.id) !== -1);
    configMessage = (Message.prototype.CONFIG_MESSAGE.indexOf(message.id) !== -1);
    requestMessage = (message.id === Message.prototype.REQUEST);
    resetMessage = (message.id === Message.prototype.RESET_SYSTEM);
    openCloseMessage = (Message.prototype.OPEN_CLOSE_MESSAGE.indexOf(message.id) !== -1);

    //console.log('NOREPLY',noReply,'CONFIG',configMessage,'REQUEST',requestMessage,'RESET',resetMessage);

    if (!noReply) {

      if (this.log.logging) {
        this.log.log('log', 'Sending ' + messageStr);
      }

      if (configMessage || openCloseMessage) {
        this.channel[message.getContent()[0]].once('RESPONSE_NO_ERROR', onReply);
      } else if (requestMessage) {
        this.once(Message.prototype.MESSAGE[message.getRequestId()], onReply);
      } else if (resetMessage) {
        this.once(Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_STARTUP], onReply);
      }

      intervalNoMessageReceivedID = setInterval(onNoMessageReceived, timeout);
    }

    msgBytes = message.getBytes();

    usb.transfer(msgBytes, onSentMessage);
  };

  Host.prototype.EVENT = {

    ERROR: 'error', // For example notification serial error

    // Data

    //BROADCAST: 'broadcast',
    BURST: 'burst', // Total burst , i.e all burst packets

  };

  Host.prototype.getDevices = function() {
    return usb.getDevices();

  };

  Host.prototype._onUSBinit = function(onInit, error) {
    if (error) {
      onInit(error);
    } else {

      usb.addListener(USBDevice.prototype.EVENT.DATA, this.deserialize.bind(this));

      usb.listen();

      this.resetSystem(onInit);

    }

  };

  Host.prototype.init = function(iDevice, onInit) {

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



    usb.init(iDevice, this._onUSBinit.bind(this, onInit));

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

  Host.prototype._concatBuffer = function(buffer1, buffer2) // https://gist.github.com/72lions/4528834
  {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);

    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);

    return tmp;
  };

  // param data - Uint8Array from USB subsystem
  Host.prototype.deserialize = function(data) {
    var msgBytes,
      iEndOfMessage,
      iStartOfMessage = 0,
      metaDataLength = Message.prototype.HEADER_LENGTH + Message.prototype.CRC_LENGTH,
      message;

    //if (this.log.logging) this.log.log('log', 'Received data length', data.byteLength, data.constructor.name);

    if (previousPacket && previousPacket.byteLength) // Holds the rest of the ANT message when receiving more data than the requested in endpoint packet size
    {
      data = this._concatBuffer(previousPacket, data);
    }

    iEndOfMessage = data[Message.prototype.iLENGTH] + metaDataLength;

    while (iStartOfMessage < iEndOfMessage) {

      msgBytes = data.subarray(iStartOfMessage, iEndOfMessage);

      //if (this.log.logging) this.log.log('log', 'Parsing', msgBytes);

      if (msgBytes[Message.prototype.iSYNC] !== Message.prototype.SYNC) {

        if (this.log.logging) this.log.log('error', 'Invalid SYNC byte ' + msgBytes[Message.prototype.iSYNC] + ' expected ' + Message.prototype.SYNC + ', discarding ' + data.length + ' bytes, byte offset of buffer ' + data.byteOffset, data);
        return;
      }

      switch (msgBytes[Message.prototype.iID]) {

        // Notifications

        case Message.prototype.NOTIFICATION_STARTUP:

          this.emit(Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_STARTUP], undefined, new NotificationStartup(msgBytes));

          break;

        case Message.prototype.NOTIFICATION_SERIAL_ERROR:

          message = new NotificationSerialError(msgBytes);
          console.log('serial error',message);
          this.emit(this.EVENT.ERROR, message, undefined);

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
            case 0x04 :   message = new AdvancedBurstCapabilitiesMessage(msgBytes);
                          break;
            case 0x0A :   message = new AdvancedBurstCurrentConfigurationMessage(msgBytes);
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

          this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.BROADCAST_DATA], undefined, message);

          break;

       case Message.prototype.ACKNOWLEDGED_DATA:

         message = new AcknowledgedDataMessage(msgBytes);
         this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.ACKNOWLEDGED_DATA], undefined, message);

         break;

        case Message.prototype.BURST_TRANSFER_DATA:

          message = new BurstDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.BURST_TRANSFER_DATA], undefined, message);

          if (message.sequenceNr === 0) // First packet
            this.channel[message.channel].burst = new Uint8Array();

          this.channel[message.channel].burst = this._concatBuffer(this.channel[message.channel].burst,message.packet);

          if (message.sequenceNr & 0x04) // Last packet
              this.channel[message.channel].emit(Channel.prototype.EVENT.BURST,undefined,message);

          break;

        // Channel event or responses

        case Message.prototype.CHANNEL_RESPONSE:

          var channelResponseMsg = new ChannelResponseMessage(msgBytes);

          console.log('RESPONSE',ChannelResponseEvent.prototype.MESSAGE[channelResponseMsg.response.code]);

          this.channel[channelResponseMsg.response.channel].emit(ChannelResponseEvent.prototype.MESSAGE[channelResponseMsg.response.code], undefined, channelResponseMsg.response);

          break;


        default:

          if (this.log.logging)
            this.log.log('log', "Unable to parse received data", data, ' msg id ', msgBytes[Message.prototype.iID]);
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

  Host.prototype.resetSystem = function(callback) {
    this.sendMessage(new ResetSystemMessage(), function _wait500msAfterReset() {
      setTimeout(callback, 500);
    });
  };

  Host.prototype.getChannelId = function(channel, callback) {
    this.sendMessage(new RequestMessage(channel, Message.prototype.SET_CHANNEL_ID), callback);
  };

  Host.prototype.getVersion = function(callback) {
    this.sendMessage(new RequestMessage(undefined, Message.prototype.ANT_VERSION), callback);
  };

  Host.prototype.getCapabilities = function(callback) {
    this.sendMessage(new RequestMessage(undefined, Message.prototype.CAPABILITIES), callback);
  };

  Host.prototype.getAdvancedBurstCapabilities = function(callback)
  {
    this.sendMessage(new RequestMessage(0x00, Message.prototype.ADVANCED_BURST_CAPABILITIES), callback);
  };

  Host.prototype.getAdvancedBurstConfiguration = function(callback)
  {
    this.sendMessage(new RequestMessage(0x01, Message.prototype.ADVANCED_BURST_CAPABILITIES), callback);
  };

  Host.prototype.getSerialNumber = function(callback) {
    this.sendMessage(new RequestMessage(undefined, Message.prototype.DEVICE_SERIAL_NUMBER), callback);
  };

  Host.prototype.configEventBuffer = function(config, size, time, callback) {
    this.sendMessage(new ConfigureEventBufferMessage(config, size, time), callback);
  };

  Host.prototype.getEventBufferConfiguration = function(callback) {
    this.sendMessage(new RequestMessage(undefined, Message.prototype.EVENT_BUFFER_CONFIGURATION), callback);
  };

  Host.prototype.getChannelStatus = function(channel, callback) {
    this.sendMessage(new RequestMessage(channel, Message.prototype.CHANNEL_STATUS), callback);
  };

  // Spec p. 75 "If supported, when this setting is enabled ANT will include the channel ID, RSSI, or timestamp data with the messages"
  // 0 - Disabled, 0x20 = Enable RX timestamp output, 0x40 - Enable RSSI output, 0x80 - Enabled Channel ID output
  Host.prototype.libConfig = function(libConfig, callback) {
    this.sendMessage(new LibConfigMessage(libConfig), callback);
  };

  // Unassign a channel. A channel must be unassigned before it may be reassigned. (spec p. 63)
  Host.prototype.unAssignChannel = function(channelNr, callback) {
    this.sendMessage(new UnAssignChannelMessage(channelNr), callback);
  };

  /* Reserves channel number and assigns channel type and network number to the channel, sets all other configuration parameters to defaults.
   Assign channel command should be issued before any other channel configuration messages (p. 64 ANT Message Protocol And Usaga Rev 50) ->
   also sets defaults values for RF, period, tx power, search timeout p.22 */
  Host.prototype.assignChannel = function(number, channelType, networkNumber, extendedAssignment, callback) {
    var cb,
      configurationMsg;

    if (typeof extendedAssignment === "function") {
      cb = extendedAssignment; // If no extended assignment use argument as callback
      configurationMsg = new AssignChannelMessage(number, channelType, networkNumber);
    } else {
      cb = callback;
      configurationMsg = new AssignChannelMessage(number, channelType, networkNumber, extendedAssignment);
    }

    this.sendMessage(configurationMsg, cb);

  };

  /* Master: id transmitted along with messages Slave: sets channel ID to match the master it wishes to find,  0 = wildecard
  "When the device number is fully known the pairing bit is ignored" (spec. p. 65)
  */
  Host.prototype.setChannelId = function(channel, deviceNum, deviceType, transmissionType, callback) {
    this.sendMessage(new SetChannelIDMessage(channel, deviceNum, deviceType, transmissionType), callback);
  };

  // Uses the lower 2 bytes of the device serial number as channel Id.
  Host.prototype.setSerialNumChannelId = function(channel, deviceType, transmissionType, callback) {
    this.sendMessage(new SetSerialNumChannelIdMessage(channel, deviceType, transmissionType), callback);
  };

  Host.prototype.setChannelPeriod = function(channel, messagePeriod, callback) {
    this.sendMessage(new SetChannelPeriodMessage(channel, messagePeriod), callback);
  };

  // Low priority search mode
  // Spec. p. 72 : "...a low priority search will not interrupt other open channels on the device while searching",
  // "If the low priority search times out, the module will switch to high priority mode"
  Host.prototype.setLowPriorityChannelSearchTimeout = function(channel, searchTimeout, callback) {
    // Timeout in sec. : ucSearchTimeout * 2.5 s, 255 = infinite, 0 = disable low priority search
    this.sendMessage(new SetLowPriorityChannelSearchTimeoutMessage(channel, searchTimeout), callback);
  };

  // Set High priority search timeout, each count in searchTimeout = 2.5 s, 255 = infinite, 0 = disable high priority search mode (default search timeout is 25 seconds)
  Host.prototype.setChannelSearchTimeout = function(channel, searchTimeout, callback) {
    this.sendMessage(new SetChannelSearchTimeoutMessage(channel, searchTimeout), callback);
  };

  // Set the RF frequency, i.e 66 = 2466 MHz
  Host.prototype.setChannelRFFreq = function(channel, RFFreq, callback) {
    this.sendMessage(new SetChannelRFFreqMessage(channel, RFFreq), callback);
  };

  // Set network key for specific net
  Host.prototype.setNetworkKey = function(netNumber, key, callback) {
    this.sendMessage(new SetNetworkKeyMessage(netNumber, key), callback);
  };

  // Set search waveform individual channel
  Host.prototype.setSearchWaveform = function(channel, searchWaveform, callback) {
    this.sendMessage(new SetSearchWaveformMessage(channel, searchWaveform), callback);
  };

  // Set transmit power for all channels
  Host.prototype.setTransmitPower = function(transmitPower, callback) {
    this.sendMessage(new SetTransmitPowerMessage(transmitPower), callback);
  };

  // Set transmit power for individual channel
  Host.prototype.setChannelTxPower = function(channel, transmitPower, callback) {
    this.sendMessage(new SetChannelTxPowerMessage(channel, transmitPower), callback);
  };

  // "Enabled a one-time proximity requirement for searching. Once a proximity searh has been successful, this threshold value will be cleared" (spec. p. 76)
  Host.prototype.setProximitySearch = function(channel, searchThreshold, callback) {
    this.sendMessage(new SetProximitySearchMessage(channel, searchThreshold), callback);
  };

  Host.prototype.openRxScanMode = function(channel, callback) {
    this.sendMessage(new OpenRxScanModeMessage(channel), callback);
  };

  // Opens a previously assigned and configured channel. Data messages or events begins to be issued. (spec p. 88)
  Host.prototype.openChannel = function(channel, callback) {
    this.sendMessage(new OpenChannelMessage(channel), callback);
  };

  // Close a channel that has been previously opened. Channel still remains assigned and can be reopened at any time. (spec. p 88)
  Host.prototype.closeChannel = function(channelNumber, callback) {

    // Wait for EVENT_CHANNEL_CLOSED ?
    // If channel status is tracking -> can get broadcast data packet before event channel closed packet

    this.sendMessage(new CloseChannelMessage(channelNumber), callback);

  };

  Host.prototype.sendBroadcastData = function(channel, broadcastData, callback,ack) {
    var data = broadcastData,
        msg;

    if (!ack)
        msg =  new BroadcastDataMessage();
    else
       msg = new AcknowledgedDataMessage();

    if (typeof broadcastData === 'object' && broadcastData.constructor.name === 'Array') // Allows sending of [1,2,3,4,5,6,7,8]
      data = new Uint8Array(broadcastData);

    msg.encode(channel,data);

    this.sendMessage(msg, callback);
  };

  // p. 96 ANT Message protocol and usave rev. 5.0
  // Event TRANSFER_TX_COMPLETED channel event if successfull,
  // Event TX_TRANSFER_FAILED -> msg. failed to reach master or response from master failed to reach the slave -> slave may retry
  // Event GO_TO_SEARCH is received if channel is dropped -> channel should be unassigned
  Host.prototype.sendAcknowledgedData = function (channel, ackData, callback) {
    this.sendBroadcastData(channel,ackData,callback,true);
  };

  // Send an individual packet as part of a burst transfer
  // We will get a EVENT_TRANFER_TX_START when the actual transfer over RF starts
 //  p. 102 ANT Message Protocol and Usage rev 5.0 - "it is possible to 'prime' the ANT buffers with 2 (or 8, depending on ANT device) burst packet prior to the next channel period."
 //  "its important that the Host/ANT interface can sustain the maximum 20kbps rate"
  Host.prototype.sendBurstTransferPacket = function (sequenceChannel, packet, callback)
  {
    var msg = new BurstDataMessage();

    msg.encode(sequenceChannel,packet);

    this.sendMessage(msg,callback);
  };

  // Sends bulk data
  // EVENT_TRANSFER_TX_START - next channel period after message sent to device
  // EVENT_TRANSFER_TX_COMPLETED
  // EVENT_TRANSFER_TX_FAILED : After 5 retries
  Host.prototype.sendBurstTransfer = function(channel, data, callback) {
    var numberOfPackets = Math.ceil(data.byteLength / Message.prototype.PAYLOAD_LENGTH),
        packetNr = 0,
        sequenceNr = 0,
        sequenceChannel, // 7:5 bits = sequence nr (000 = first packet, 7 bit high on last packet) - transfer integrity, 0:4 bits channel nr
        packet,
        tmpPacket,
        txFailed=false,

      sendPacket = function () {

        if (sequenceNr > 3) // Roll over sequence nr
          sequenceNr = 1;

        if (packetNr === (numberOfPackets-1))
          sequenceNr = sequenceNr | 0x04;  // Set most significant bit high for last packet, i.e sequenceNr 000 -> 100

        packet = data.subarray(packetNr * Message.prototype.PAYLOAD_LENGTH, (packetNr + 1)* Message.prototype.PAYLOAD_LENGTH);

        // Fill with 0 for last packet if necessary

        if (packet.byteLength < Message.prototype.PAYLOAD_LENGTH) {
          tmpPacket = new Uint8Array(Message.prototype.PAYLOAD_LENGTH);
          tmpPacket.set(packet);
          packet = tmpPacket;
        }

        sequenceChannel = (sequenceNr << 5) | channel;

       this.sendBurstTransferPacket(sequenceChannel, packet, function (err,msg) {

          if (txFailed) // Stop in case of failure
            return;

             if (!err) {

                   sequenceNr++;
                   packetNr++;
                   if (packetNr < numberOfPackets)
                     sendPacket();
                   else
                     callback(undefined); // Finished sending to ANT engine

             } else
             {
              /// this.chanel[channel].removeListener('EVENT_TRANSFER_TX_COMPLETED');
              // this.chanel[channel].removeListener('EVENT_TRANSFER_TX_FAILED');

               callback(err);
             }

         });
      }.bind(this),

      onTxCompleted = function (err,msg)
      {
        //console.timeEnd('TXCOMPLETED');
      },

      onTxStart = function (err,msg)
      {
        //console.time('TXCOMPLETED');
      },

      onTxFailed = function (err,msg)
      {
        // If retry, must start with packet 0 again
        //clearTimeout(sendNextPacketTimeoutID);
        txFailed = true;
        console.log('FAILED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',err,msg);
        callback(new Error(msg.toString()),msg);
      }.bind(this);

    if (this.log.logging)
      this.log.log('log', 'Sending burst ' + numberOfPackets + ' packets channel ' + channel + ' ' + data.byteLength + ' bytes ');

     this.channel[channel].once('EVENT_TRANSFER_TX_COMPLETED',onTxCompleted);
     this.channel[channel].once('EVENT_TRANSFER_TX_FAILED',onTxFailed);
     this.channel[channel].once('EVENT_TRANSFER_TX_START',onTxStart);

     if (typeof data === 'object' && data.constructor.name === 'Array') // Allows sending of Array [1,2,3,4,5,6,7,8,...]
       data = new Uint8Array(data);

     sendPacket();

  };

  module.exports = Host;
  return module.exports;
});
