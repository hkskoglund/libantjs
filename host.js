/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

'use strict';

   var

    // Data

    BroadcastDataMessage = require('./messages/BroadcastDataMessage'),

    Logger = require('./logger'),
    USBDevice = require('./usb/USBDevice'),
    Channel = require('./channel'),
    ANTMessage = require('./messages/ANTMessage'),

    // Control ANT
    ResetSystemMessage = require('./messages/ResetSystemMessage'),
    OpenChannelMessage = require('./messages/OpenChannelMessage'),
    OpenRxScanModeMessage = require('./messages/OpenRxScanModeMessage'),
    CloseChannelMessage = require('./messages/CloseChannelMessage'),

    // Notifications

    NotificationStartup = require('./messages/NotificationStartup'),
    NotificationSerialError = require('./messages/NotificationSerialError'),

    // Request -response

    RequestMessage = require('./messages/RequestMessage'),

        CapabilitiesMessage = require('./messages/CapabilitiesMessage'),
        ANTVersionMessage = require('./messages/ANTVersionMessage'),
        DeviceSerialNumberMessage = require('./messages/DeviceSerialNumberMessage'),

    // Configuration

    AssignChannelMessage = require('./messages/AssignChannelMessage'),
    UnAssignChannelMessage = require('./messages/UnAssignChannelMessage'),
    SetChannelIDMessage = require('./messages/SetChannelIDMessage'),
    SetChannelPeriodMessage = require('./messages/SetChannelPeriodMessage'),
    SetChannelSearchTimeoutMessage = require('./messages/SetChannelSearchTimeoutMessage'),
    SetLowPriorityChannelSearchTimeoutMessage = require('./messages/SetLowPriorityChannelSearchTimeoutMessage'),
    SetChannelRFFreqMessage = require('./messages/SetChannelRFFreqMessage'),
    SetNetworkKeyMessage = require('./messages/SetNetworkKeyMessage'),
    SetTransmitPowerMessage = require('./messages/SetTransmitPowerMessage'),
    SetChannelTxPowerMessage = require('./messages/SetChannelTxPowerMessage'),
    SetProximitySearchMessage = require('./messages/SetProximitySearchMessage'),
    SetSerialNumChannelIdMessage = require('./messages/SetSerialNumChannelIdMessage'),

    // Extended messaging information (channel ID, RSSI and RX timestamp)
    LibConfigMessage = require('./messages/LibConfigMessage'),
    LibConfig = require('./messages/libConfig'),


    ChannelResponseMessage = require('./messages/ChannelResponseMessage'),
    ChannelStatusMessage = require('./messages/ChannelStatusMessage'),

    ChannelId = require('./messages/channelId'),

    // Profiles

    RxScanModeProfile = require('./profiles/RxScanMode'),

    // Private objects

    // Don't expose usb interface to higher level code, use wrappers instead on host

    UsbLib,
    usb,
    usbLibraryPath,

    _ANTMessage = new ANTMessage(); // For CRC verification

    // Detect host environment, i.e if running on node load node specific USB library

    // Node/iojs

    if (typeof process !== 'undefined' && process.title === 'node')
      {
        usbLibraryPath = './usb/USBNode';
      }

    // Chrome packaged app

      else if (typeof window !== 'undefined' && typeof window.chrome === 'object')
      {
        usbLibraryPath = './usb/USBChrome';
      }

    UsbLib = require(usbLibraryPath);

// Host for USB ANT communication
function Host(options) {

    if (!options) {
      options = {};
    }

    options.logSource = this;

    this.options = options;

    this.log = new Logger(options);

    this._channel = {};

    if (this.log.logging) {  this.log.log('log','Loaded USB library from '+usbLibraryPath); }

    usb = new UsbLib({ log : options.log});

    this.state = this.STATE.INIT;
    this.responseCallback  = undefined; // Function to call when receiving a response from ANT chip
}

//Host.prototype = Object.create(events.EventEmitter.prototype, { constructor : { value : Host,
//                                                                        enumerable : false,
//                                                                        writeable : true,
//                                                                        configurable : true } });

//Use state-machine for keeping track of messaging state
Host.prototype.STATE = {
  INIT : 0x00,
  RTS : 0x01, // Ready to send next message to ANT
  WAIT : 0x02, // Waiting for response from ANT
  ERROR : 0x03 // Something went wrong
};

// Send a message to ANT
Host.prototype.sendMessage = function (message, callback) {

  if (this.state !== this.STATE.RTS) {
    callback(new Error('Unable to send message state is '+this.state));
    return;
  }

   var _sendMessageCB = function (error)
   {

     if (error) {
        this.state = this.STATE.ERROR;
        if (this.log.logging) {  this.log.log('error', 'TX failed of ' + message.toString(),error); }
        this.responseCallback(error);
     }

     // on success, responseCallback is called during pasring of response in RXparse

   }.bind(this);

    if (this.log.logging) { this.log.log('log', 'Sending message '+ message.toString()); }

    this.state = this.state.WAIT; // Don't allow more messages while we wait for the response
    this.responseCallback = callback;

    usb.transfer(message.getRawMessage(),_sendMessageCB);

};

// for event emitter
Host.prototype.EVENT = {

//    LOG_MESSAGE: 'logMessage',
//    ERROR : 'error',

    //SET_CHANNEL_ID: 'setChannelId',

    // Data
    BROADCAST: 'broadcast',
    BURST: 'burst',

    //CHANNEL_RESPONSE_EVENT : 'channelResponseEvent',

    PAGE : 'page' // Page from ANT+ sensor / device profile

};

Host.prototype.establishRXScanModeChannel = function (onPage)
{

  var channel = new RxScanModeProfile({
      log: true,
      channelId: {
          deviceNumber: 0,
          deviceType: 0,
          transmissionType: 0
      }
  });

  channel.addListener('page', onPage);

  function onChannelEstablished(error)
  {
    console.log('onChannelEstablished',arguments);

  }

  this.establishChannel({
      channelNumber: 0,
      networkNumber: 0,
      // channelPeriod will be ignored for RxScanMode channel
      //channelPeriod: TEMPprofile.prototype.CHANNEL_PERIOD_ALTERNATIVE, // 0.5 Hz - every 2 seconds
      configurationName: 'slave only',
      channel: channel,
      open: true
  }, onChannelEstablished);
};

// Spec. p. 21 sec. 5.3 Establishing a channel
// Assign channel and set channel ID MUST be set before opening
Host.prototype.establishChannel = function (channelInfo, callback) {
    var     channelNumber = channelInfo.channelNumber,
    networkNumber = channelInfo.networkNumber,
    configurationName = channelInfo.configurationName,
    channel = channelInfo.channel,
    channelPeriod = channelInfo.channelPeriod,
    open = channelInfo.open;

    var parameters = channel.parameters[configurationName],
        //channelType,
        isMasterChannel,
        msg;

     if (parameters === undefined)
     {
        callback(new Error('Could not find configuration '+configurationName));
        return;
     }

     isMasterChannel = channel.isMaster(configurationName);

     if (this.log.logging)
         this.log.log('log', 'Establishing channel for configuration', configurationName, parameters, 'Master channel : ' + isMasterChannel);


    //console.log("Options", parameters);

    if (typeof parameters.channelType === "undefined") {
        callback(new Error('No channel type specified'));
        return;
    }

    if (typeof parameters.channelType === "string")
        switch (parameters.channelType.toLowerCase()) {
            case 'slave':
                parameters.channelType = Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL;
                break;

            case 'master':
                parameters.channelType = Channel.prototype.TYPE.BIDIRECTIONAL_MASTER_CHANNEL;
                break;

            case 'shared slave':
                parameters.channelType = Channel.prototype.TYPE.SHARED_BIDIRECTIONAL_SLAVE_CHANNEL;
                break;

            case 'shared master':
                parameters.channelType = Channel.prototype.TYPE.SHARED_BIDIRECTIONAL_MASTER_CHANNEL;
                break;

            case 'slave only':
                parameters.channelType = Channel.prototype.TYPE.SLAVE_RECEIVE_ONLY_CHANNEL;  // Only receive BROADCAST - "recommended for diagnostic applications using continous scan mode". (spec. p. 15)
                break;

            case 'master only':
                parameters.channelType = Channel.prototype.TYPE.MASTER_TRANSMIT_ONLY_CHANNEL; // Only transmit BROADCAST -"not recommended for general use, disables the ANT channel management mechanisms" (spec p. 15)
                break;

            default:
                callback(new Error('Unknown channel type specified ' + parameters.channelType));
                return;

        }
    else if (typeof Channel.prototype.TYPE[parameters.channelType] === "undefined") {
        callback(new Error('Unknown channel type specified ' + parameters.channelType));
        return;
    }

    if (!parameters.channelId) {
        callback(new Error('No channel ID specified'));
        return;
    }

    // Slave - convert declarative syntax to channelId object
    if (!(parameters.channelId instanceof ChannelId) && !isMasterChannel) { // Allow for channel Id. object literal with '*' as 0x00

        if (typeof parameters.channelId.deviceNumber === "undefined" || parameters.channelId.deviceNumber === '*' || typeof parameters.channelId.deviceNumber !== 'number')
            parameters.channelId.deviceNumber = 0x00;

        if (typeof parameters.channelId.deviceType === "undefined" || parameters.channelId.deviceType === '*' || typeof parameters.channelId.deviceType !== 'number')
            parameters.channelId.deviceType = 0x00;

        if (typeof parameters.channelId.transmissionType === "undefined" || parameters.channelId.transmissionType === '*' || typeof parameters.channelId.transmissionType !== 'number')
            parameters.channelId.transmissionType = 0x00;

        parameters.channelId = new ChannelId(parameters.channelId.deviceNumber, parameters.channelId.deviceType, parameters.channelId.transmissionType);
    }

    // Master - convert declarative syntax to channelId object
    if (!(parameters.channelId instanceof ChannelId) && isMasterChannel) {

        if (typeof parameters.channelId.deviceNumber === "undefined") {
            callback(new Error('No device number specified in channel Id'));
            return;
        }

        if (typeof parameters.channelId.deviceType === "undefined") {
            callback(new Error('No device type specified in channel Id'));
            return;
        }

        if (typeof parameters.channelId.transmissionType === "undefined") {
            callback(new Error('No transmission type specified in channel Id'));
            return;
        }

        if (parameters.channelId.deviceNumber === 'serial number' && (typeof this.deviceSerialNumber === "undefined" || (this.deviceSerialNumber & 0xFFFF) === 0x00))
            {
                callback(new Error('No ANT device serial number available or the 2 least significant bytes of serial number is 0, device serial number 0x'+this.deviceSerialNumber.toString(16)));
                return;
            }

        parameters.channelId = new ChannelId(this.deviceSerialNumber & 0xFFFF, parameters.channelId.deviceType, parameters.channelId.transmissionType);

    }

    if (parameters.extendedAssignment && typeof parameters.extendedAssignment === 'string')
        switch (parameters.extendedAssignment.toLowerCase()) {
            case 'background scanning':
                parameters.extendedAssignment = Channel.prototype.EXTENDED_ASSIGNMENT.BACKGROUND_SCANNING_ENABLE;
                break;
            case 'frequency agility':
                parameters.extendedAssignment = Channel.prototype.EXTENDED_ASSIGNMENT.FREQUENCY_AGILITY_ENABLE;
                break;
            case 'fast channel initiation':
                parameters.extendedAssignment = Channel.prototype.EXTENDED_ASSIGNMENT.FAST_CHANNEL_INITIATION_ENABLE; // Skips search window check, reduce latency between open and transmission
                break;
            case 'asynchronous transmission':
                parameters.extendedAssignment = Channel.prototype.EXTENDED_ASSIGNMENT.ASYNCHRONOUS_TRANSMISSION_ENABLE;
                break;
            default:
                if (this.log.logging)
                    this.log.log('error', 'Unknown extended assignment ' + parameters.extendedAssignment);
                parameters.extendedAssignment = undefined;
                break;
        }

    // If neccessary override channelNumber if channel type is 'Rx only'/'slave only'

    if (parameters.RxScanMode && channelNumber !== 0)
    {
        if (this.log.logging)
            this.log.log('log', 'C# ', channelNumber, ' not allowed for continous Rx scan mode. Setting it to 0');
        channelInfo.channelNumber = 0;
        channelNumber = 0;
    }

    if (this.log.logging)
        this.log.log('log', 'Establishing ' + channel.showConfiguration(configurationName) + ' C# ' + channelNumber + ' N# ' + networkNumber);

    if (this._channel[channelNumber] === undefined)
        this._channel[channelNumber] = {};
    else if (this.log.logging)
       this.log.log('warn','Overwriting previous channel information for channel C# '+channelNumber,this._channel[channelNumber]);

    this._channel[channelNumber].channel = channel; // Associate channel with particular channel number on host
    this._channel[channelNumber].network = networkNumber;

    this.getChannelStatus(channelNumber, function _statusCB(error, statusMsg) {
        if (!error) {

            if (statusMsg.channelStatus.state !== ChannelStatusMessage.prototype.STATE.UN_ASSIGNED) {
                msg = 'Channel ' + channelNumber + ' on network ' + networkNumber + 'is ' + statusMsg.channelStatus.stateMessage;
                if (this.log.logging)
                    this.log.log('log', msg);
                callback(new Error(msg));
                return;
            }

            // MUST have - assign channel + set channel ID

            var assignChannelSetChannelId = function _setNetworkKeyCB() {
                this.assignChannel(channelNumber, parameters.channelType, networkNumber, parameters.extendedAssignment, function _assignCB(error, response) {

                    if (!error) {
                        if (this.log.logging)
                            this.log.log('log', response.toString());
                        //setTimeout(function () {
                        this.setChannelId(channelNumber, parameters.channelId.deviceNumber, parameters.channelId.deviceType, parameters.channelId.transmissionType, function (error, response) {
                            if (!error) {
                                //this.once("assignChannelSetChannelId");

                                if (this.log.logging)
                                    this.log.log('log', response.toString());
                                setChannelRFFreq();
                            }
                            else
                                callback(error);
                        }.bind(this));
                        //}.bind(this), 100);
                    }
                    else
                        callback(error);
                }.bind(this));
            }.bind(this);


            var setChannelPeriod = function () {
                var cPeriod;
                if (Array.isArray(parameters.channelPeriod)) // i.e [8192, 65535 ]
                  cPeriod = channelPeriod || parameters.channelPeriod[0];
                else
                  cPeriod = channelPeriod || parameters.channelPeriod;

                if (cPeriod === undefined && !parameters.RxScanMode)
                {

                    callback(new Error('Channel period is undefined'));
                    return;
                }

                if (parameters.RxScanMode)
                {
                    openChannel();
                }
                else

                    this.setChannelPeriod(channelNumber, cPeriod, function (error, response) {
                        if (!error) {
                            if (this.log.logging)
                                this.log.log('log', response.toString());
                            setChannelSearchTimeout();
                        }
                        else
                            callback(error);
                    }.bind(this));

            }.bind(this);

            // Default 66 = 2466 MHz

            var setChannelRFFreq =  function () {
                if (parameters.RFfrequency)
                    this.setChannelRFFreq(channelNumber, parameters.RFfrequency, function (error, response) {
                        if (!error) {
                            if (this.log.logging)
                                this.log.log('log', response.toString());
                            setChannelPeriod();
                        }
                        else
                            callback(error);
                    }.bind(this));
                else
                    setChannelPeriod();

            }.bind(this);

            ////// Default 3 = 0bDm

            //var setTransmitPower = function () {
            //    if (parameters.transmitPower)
            //        this.setTransmitPower(parameters.transmitPower, function (error, response) {
            //            if (!error) {
            //                this.log.log('log',response.toString());
            //                setChannelTxPower();
            //            }
            //            else
            //                this.log.log( error);
            //        }.bind(this));
            //    else
            //        setChannelTxPower();
            //}.bind(this);

            //var setChannelTxPower = function () {
            //    if (parameters.channelTxPower)
            //        this.setChannelTxPower(channelNumber,parameters.channelTxPower, function (error, response) {
            //            if (!error) {
            //                this.log.log( response.toString());
            //                setChannelSearchTimeout();
            //            }
            //            else
            //                this.log.log( error);
            //        }.bind(this));
            //    else
            //        setChannelSearchTimeout();
            //}.bind(this);

            // Optional

            if (parameters.networkKey)

                this.setNetworkKey(networkNumber, parameters.networkKey, function _setNetworkKeyCB(error, response) {
                    if (!error) {
                        if (this.log.logging)
                            this.log.log('log', response.toString());
                        assignChannelSetChannelId();
                    }
                    else
                        callback(error);
                }.bind(this));
            else
                assignChannelSetChannelId();

            //// Optional

            //// SLAVE SEARCH TIMEOUTS : high priority and low priority

            //    this.log.log("Channel "+channelNumber+" type "+ Channel.prototype.TYPE[parameters.channelType]);

            var setChannelSearchTimeout = function () {
                // Default HP = 10 -> 25 seconds
                if (!isMasterChannel && parameters.HPsearchTimeout)
                    this.setChannelSearchTimeout(channelNumber, parameters.HPsearchTimeout, function (error, response) {
                        if (!error) {
                            setLowPriorityChannelSearchTimeout();
                            if (this.log.logging)
                                this.log.log('log', response.toString());
                        }
                        else
                            callback(error);
                    }.bind(this));
                else
                    setLowPriorityChannelSearchTimeout();
            }.bind(this);

            var setLowPriorityChannelSearchTimeout = function () {
                // Default LP = 2 -> 5 seconds
                if (!isMasterChannel && parameters.LPsearchTimeout)
                    this.setLowPriorityChannelSearchTimeout(channelNumber, parameters.LPsearchTimeout, function (error, response) {
                        if (!error) {
                            if (this.log.logging)
                                this.log.log('log', response.toString());
                            openChannel();
                        }
                        else
                            callback(error);
                    }.bind(this));
                else
                    openChannel();
            }.bind(this);

//            var setProximitySearch = function () {
//                if (parameters.proximitySearch)
//                    this.setProximitySearch(channelNumber, parameters.proximitySearch, function (error, response) {
//                        if (!error) {
//                            this.log.log('log', response.toString());
//                            openChannel();
//                        }
//                        else
//                            callback(error);
//                    }.bind(this));
//                else
//                    openChannel();
//            }.bind(this);


            var openChannel = function () {

                // Attach etablished channel info (C#,N#,...)
                channel.establish = channelInfo;

                var openResponseHandler = function (error, response) {
                        if (!error) {
                            if (this.log.logging)
                                this.log.log('log', response.toString());
                            callback(undefined,channel);
                        }
                        else
                            callback(error,channel);
                    }.bind(this);

                if (open) {
                    if (!parameters.RxScanMode)
                      this.openChannel(channelNumber, openResponseHandler);
                    else
                        this.openRxScanMode(channelNumber, openResponseHandler); // channelNumber should be 0
                } else callback();

            }.bind(this);

        }
        else
            callback(error);
    }.bind(this));
};

Host.prototype.getDevices = function ()
{
   return usb.getDevices();

};

Host.prototype.init = function (iDevice,onInit) {

      /*  libConfig = new LibConfig(LibConfig.prototype.Flag.CHANNEL_ID_ENABLED, LibConfig.prototype.Flag.RSSI_ENABLED, LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED);

        this.libConfig(libConfig.getFlagsByte(),
            function _libConfig(error, channelResponse) {
                if (!error) {

                    if (this.log.logging)
                        this.log.log('log', libConfig.toString());
                    _doLibConfigCB();
                }
                else
                    _doLibConfigCB(error);
            }.bind(this)); */


        var onUSBinit = function _onUSBinit(error) {

          if (error) {
              this.state = this.state.ERROR;
              onInit(error);
            }
            else {

                usb.addListener(USBDevice.prototype.EVENT.DATA, this.RXparse.bind(this));

                usb.listen();

                this.state = this.STATE.RTS;

                this.resetSystem(onReset);

              //  resetCapabilitiesLibConfig(onInit);

            }

        }.bind(this);

        // THEN

        var onReset = function _onReset(error,notification)
        {
          if (!error)
             this.getCapabilities(onCapabilities);
          else {
             onInit(error,notification);
           }
        }.bind(this);

        // THEN

        var onCapabilities = function _onCapabilities(error,capabilities)
        {

          if (!error) {
            this.getVersion(onVersion);
          } else
             {
               onInit(error,capabilities);
             }

        }.bind(this);

        // THEN

        var onVersion = function _onVersion(error,version)
        {
          if (!error) {
            this.getSerialNumber(onSerialNumber);
          } else
             {
               onInit(error,version);
             }
        }.bind(this);

        // THEN

        var onSerialNumber = function _onSerialNumber(error,serialNumber)
        {
           onInit(error,serialNumber);
        }.bind(this);

    usb.init(iDevice,onUSBinit);

};

// Exit host
Host.prototype.exit = function (callback) {

   // TO DO? Close open channels? Exit channels/profiles?

    usb.exit(callback);

};

Host.prototype._runResponseCallback = function (error,message)
{

    if (error)
      this.state = this.STATE.ERROR;
    else
      this.state = this.STATE.RTS;

    if (this.log.logging)
          this.log.log('log', message.toString());

    this.responseCallback(error,message);

};

// param data - ArrayBuffer from USB
Host.prototype.RXparse = function (data) {

  var message,
      iSYNC = 0,
      iLength = 1,
      iID = 2,
      iCRC;

    if (data === undefined)
    {
        if (this.log.logging) this.log.log('error','Undefined data received in RX parser, may indicate problems with USB provider');

        return;
    }

    if (data[iSYNC] !== ANTMessage.prototype.SYNC) {

        if (this.log.logging) this.log.log('error', 'Invalid SYNC byte ' + data[iSYNC] + ' expected ' + ANTMessage.prototype.SYNC + ' cannot trust the integrity of data, discarding ' + data.length + 'bytes, byte offset of buffer ' + data.byteOffset, data);

        return;
    }

    if (this.log.logging) this.log.log('log', 'Received data length',data.byteLength);

    message = data.subarray(0,data[iLength] + 4);
    if (this.log.logging) this.log.log('log', 'Parsing',message);

    var notification;

    //// Check CRC

    iCRC = message[iLength] + 3;
    var receivedCRC = message[iCRC];

    if (typeof receivedCRC === 'undefined')
    {
        if (this.log.logging) this.log.log('Unable to get CRC of ANT message', message);
        return;
    }

    var CRC = _ANTMessage.getCRC(message);

    if (receivedCRC !== CRC)
    {
        if (this.log.logging) this.log.log('CRC not valid, skipping parsing of message, received CRC ' + receivedCRC + ' calculated CRC ' + CRC);
        return;
    }

    switch (message[iID])
    {

      // Notifications

      case ANTMessage.prototype.MESSAGE.NOTIFICATION_STARTUP:

          notification = new NotificationStartup(message);

          this._runResponseCallback(undefined,notification);

          break;

      case ANTMessage.prototype.MESSAGE.NOTIFICATION_SERIAL_ERROR:

          notification = new NotificationSerialError(message);

          this._runResponseCallback(new Error('Notification: Serial error'),notification);

          break;

      case ANTMessage.prototype.MESSAGE.CAPABILITIES:

          var capabilitiesMsg = new CapabilitiesMessage(message);

          this.capabilities = capabilitiesMsg;

          this._runResponseCallback(undefined,capabilitiesMsg);

          break;

      case ANTMessage.prototype.MESSAGE.ANT_VERSION:

          this._runResponseCallback(undefined,new ANTVersionMessage(message));

          break;

      case ANTMessage.prototype.MESSAGE.DEVICE_SERIAL_NUMBER:

          var serialNumberMsg = new DeviceSerialNumberMessage(message);

          this.deviceSerialNumber = serialNumberMsg.serialNumber;

          this._runResponseCallback(undefined,serialNumberMsg);

          break;

//        //// Data
//
//        //case ANTMessage.prototype.MESSAGE.burst_transfer_data.id:
//
//        //    ANTmsg.channel = data[3] & 0x1F; // 5 lower bits
//        //    ANTmsg.sequenceNr = (data[3] & 0xE0) >> 5; // 3 upper bits
//
//        //    if (ANTmsg.length >= 9) { // 1 byte for channel NR + 8 byte payload - standard message format
//
//        //        msgStr += "BURST on CHANNEL " + ANTmsg.channel + " SEQUENCE NR " + ANTmsg.sequenceNr;
//        //        if (ANTmsg.sequenceNr & 0x04) // last packet
//        //            msgStr += " LAST";
//
//        //        payloadData = data.slice(4, 12);
//
//        //        // Assemble burst data packets on channelConfiguration for channel, assume sequence number are received in order ...
//
//        //        // console.log(payloadData);
//
//        //        if (ANTmsg.sequenceNr === 0x00) // First packet
//        //        {
//        //            // this.log.time('burst');
//        //            antInstance.channelConfiguration[ANTmsg.channel].startBurstTimestamp = Date.now();
//
//        //            antInstance.channelConfiguration[ANTmsg.channel].burstData = payloadData; // Payload 8 bytes
//
//        //            // Extended msg. only in the first packet
//        //            if (ANTmsg.length > 9) {
//        //                msgFlag = data[12];
//        //                //console.log("Extended msg. flag : 0x"+msgFlag.toString(16));
//        //                this.parse_extended_message(ANTmsg.channel, data);
//        //            }
//        //        }
//        //        else if (ANTmsg.sequenceNr > 0x00)
//
//        //            antInstance.channelConfiguration[ANTmsg.channel].burstData = Buffer.concat([antInstance.channelConfiguration[ANTmsg.channel].burstData, payloadData]);
//
//        //        if (ANTmsg.sequenceNr & 0x04) // msb set === last packet
//        //        {
//        //            //console.timeEnd('burst');
//        //            antInstance.channelConfiguration[ANTmsg.channel].endBurstTimestamp = Date.now();
//
//        //            var diff = antInstance.channelConfiguration[ANTmsg.channel].endBurstTimestamp - antInstance.channelConfiguration[ANTmsg.channel].startBurstTimestamp;
//
//        //            // console.log("Burst time", diff, " bytes/sec", (antInstance.channelConfiguration[channelNr].burstData.length / (diff / 1000)).toFixed(1), "bytes:", antInstance.channelConfiguration[channelNr].burstData.length);
//
//        //            burstMsg = antInstance.burstQueue[ANTmsg.channel][0];
//        //            if (typeof burstMsg !== "undefined")
//        //                burstParser = burstMsg.parser;
//
//        //            if (!antInstance.channelConfiguration[ANTmsg.channel].emit(Channel.prototype.EVENT.BURST, ANTmsg.channel, antInstance.channelConfiguration[ANTmsg.channel].burstData, burstParser))
//        //                antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "No listener for event Channel.prototype.EVENT.BURST on channel " + ANTmsg.channel);
//        //            else
//        //                antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Burst data received " + antInstance.channelConfiguration[ANTmsg.channel].burstData.length + " bytes time " + diff + " ms rate " + (antInstance.channelConfiguration[ANTmsg.channel].burstData.length / (diff / 1000)).toFixed(1) + " bytes/sec");
//
//        //            //antInstance.channelConfiguration[channelNr].parseBurstData(antInstance.channelConfiguration[channelNr].burstData, burstParser);
//        //        }
//        //    }
//        //    else {
//        //        console.trace();
//        //        console.log("Data", data);
//        //        antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Cannot handle this message of "+ANTmsg.length+ " bytes. Expecting a message length of 9 for standard messages or greater for extended messages (channel ID/RSSI/RX timestamp)");
//        //    }
//
//        //    break;
//
        case ANTMessage.prototype.MESSAGE.BROADCAST_DATA:

//            // Example RX broadcast standard message : <Buffer a4 09 4e 01 84 00 5a 64 79 66 40 93 94>

            var broadcast = new BroadcastDataMessage();

            broadcast.parse(message);

         // Send broad to specific channel handler
            if (typeof this._channel[broadcast.channel] !== "undefined") {

                if (typeof this._channel[broadcast.channel].channel.broadCast !== 'function') {
                   if (this.log.logging) this.log.log('warn', "No broadCast function available : on C# " + broadcast.channel);
                }

                else {
                    broadcast.channelId.sensorId = broadcast.channelId.getUniqueId(this._channel[broadcast.channel].network, broadcast.channel);
                    var page = this._channel[broadcast.channel].channel.broadCast(broadcast);
//                    if (resultBroadcast)
//                        this.log.log('log',resultBroadcast);
                }
            } else if (this.log.logging)
                this.log.log('warn','No channel on host is associated with ' + broadcast.toString()); // Skip parsing of broadcast content


            break;


//
//            // Channel event or responses
//
        case ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE:

            var channelResponseMsg = new ChannelResponseMessage(message);
            //var channelResponseMsg = this.channelResponseMessage;
            //channelResponseMsg.parse(message);

//            //TEST provoking EVENT_CHANNEL_ACTIVE
//            //data[5] = 0xF;
//            channelResponseMsg.setContent(data.subarray(3, 3 + ANTmsg.length));
//            channelResponseMsg.parse();
            if (channelResponseMsg.initiatingId)
             // this.log.timeEnd(ANTMessage.prototype.MESSAGE[channelResponseMsg.initiatingId]);

            // Handle channel response for channel configuration commands
            if (!channelResponseMsg.isRFEvent())
                this.responseCallback(undefined,channelResponseMsg);
//            else
//                this.log.log('log',channelResponseMsg.toString(),channelResponseMsg,this._channel);
//
            // Check for channel response callback
           if (typeof this._channel[channelResponseMsg.channel] !== "undefined") {

               if (typeof this._channel[channelResponseMsg.channel].channel.channelResponse !== 'function' ) {
                 if (this.log.logging)  this.log.log('warn', "No channelResponse function available : on C# " + channelResponseMsg.channel);
               }

                else {
                  this._channel[channelResponseMsg.channel].channel.channelResponse(channelResponseMsg);
                }

           } else if (this.log.logging)
                this.log.log('log','No channel on host is associated with ' + channelResponseMsg.toString());

            break;
//
//            // Response messages to request
//
//            // Channel specific
//
        case ANTMessage.prototype.MESSAGE.CHANNEL_STATUS:

            var channelStatusMsg = new ChannelStatusMessage(message);
           // this.log.timeEnd(ANTMessage.prototype.MESSAGE[channelStatusMsg.id]);
//            channelStatusMsg.setContent(data.subarray(3, 3 + ANTmsg.length));
//            channelStatusMsg.parse();
            //console.log("status", channelStatusMsg);

           this.responseCallback(undefined,channelStatusMsg);

            break;
//
//        case ANTMessage.prototype.MESSAGE.CHANNEL_ID:
//
//            var channelIdMsg = new ChannelIdMessage();
//            channelIdMsg.setContent(data.slice(3, 3 + ANTmsg.length));
//            channelIdMsg.parse();
//
//            console.log("Got response channel ID", channelIdMsg.toString());
//
////
////
////            if (!this.emit(ParseANTResponse.prototype.EVENT.CHANNEL_ID, channelIdMsg))
////                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + channelIdMsg.toString());
//
//            //if (!antInstance.emit(ParseANTResponse.prototype.EVENT.SET_CHANNEL_ID, data))
//            //    antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "No listener for event ParseANTResponse.prototype.EVENT.SET_CHANNEL_ID");
//            break;
//
//            // ANT device specific, i.e nRF24AP2
//


        default:

            if (this.log.logging)
                this.log.log('log', "Unable to parse received data", data, ' msg id ', message[iID]);
            break;
    }

    // TO DO : parse reset of data (next message)

};


// Send a reset device command
Host.prototype.resetSystem = function (callback) {

    var msg = new ResetSystemMessage();

    this.sendMessage(msg, callback);

};

// Send request for channel ID
Host.prototype.getChannelId = function (channel, callback) {
    var msg = (new RequestMessage(channel, ANTMessage.prototype.MESSAGE.CHANNEL_ID));

    this.sendMessage(msg, callback);
};

// Send a request for ANT version
Host.prototype.getVersion = function (callback) {

    var msg = (new RequestMessage(undefined, ANTMessage.prototype.MESSAGE.ANT_VERSION));

    this.sendMessage(msg,callback);

};

// Send a request for device capabilities
Host.prototype.getCapabilities = function (callback) {

    var msg = (new RequestMessage(undefined, ANTMessage.prototype.MESSAGE.CAPABILITIES));

    this.sendMessage(msg, callback);

};

// Send a request for device serial number
Host.prototype.getSerialNumber = function (callback) {

      if (!this.capabilities.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED)  {
           callback(new Error('Device does not have capability to determine serial number'));
          return;
      }

      var msg = new RequestMessage(undefined, ANTMessage.prototype.MESSAGE.DEVICE_SERIAL_NUMBER);

      this.sendMessage(msg,  callback);

};

// Send request for channel status, determine state (un-assigned, assigned, searching or tracking)
Host.prototype.getChannelStatus = function (channel, callback) {

    var msg = new RequestMessage(channel, ANTMessage.prototype.MESSAGE.CHANNEL_STATUS);

     this.sendMessage(msg, callback);

};

Host.prototype.getChannelStatusAll = function (callback) {
    var channelNumber = 0,
        msg;

    var  singleChannelStatus = function () {
        this.getChannelStatus(channelNumber, function _statusCB(error, statusMsg) {
            if (!error) {
                this._channel[channelNumber].status = statusMsg;

                msg = channelNumber + '       ' + statusMsg.channelStatus.networkNumber + ' '+statusMsg.channelStatus.stateMessage;
                if (this.log.logging)
                    this.log.log('log', msg);
                channelNumber++;
                if (channelNumber < this.capabilities.MAX_CHAN)
                    singleChannelStatus();
                else {

                    callback();
                }
            }
            else
                callback(error);
        }.bind(this));
    }.bind(this);

    var fetchSingleChannelStatus = function () {

        if (this.log.logging)
            this.log.log('log', 'Channel Network State');
        singleChannelStatus();
    }.bind(this);


    if (!this.capabilities) {
        if (this.log.logging)
            this.log.log('warn', 'Cannot determine max number of channels, capabilities object not available, call .getCapabilities first - trying to getCapabilities now');
        this.getCapabilities(function (error,capabilities) { if (!error) fetchSingleChannelStatus();
                                                             else callback(error);  });
    } else
       fetchSingleChannelStatus();
};

    // Spec p. 75 "If supported, when this setting is enabled ANT will include the channel ID, RSSI, or timestamp data with the messages"
    // 0 - Disabled, 0x20 = Enable RX timestamp output, 0x40 - Enable RSSI output, 0x80 - Enabled Channel ID output
    Host.prototype.libConfig = function (libConfig, callback) {

//        assert.equal(typeof this.capabilities, "object", "Capabilities not available");
//        assert.ok(this.capabilities.advancedOptions2.CAPABILITIES_EXT_MESSAGE_ENABLED, "Extended messaging not supported on device");

     var configurationMsg = new LibConfigMessage(libConfig);

    this.sendMessage(configurationMsg, callback);

 };

    //// Only enables Channel ID extension of messages
    //Host.prototype.RxExtMesgsEnable = function (ucEnable, errorCallback, successCallback) {
    //    var self = this, filler = 0, message = new ANTMessage();

    //    self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Instead of using this API call libConfig can be used");

    //    if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
    //        this.sendAndVerifyResponseNoError(message.create_message(ANTMessage.prototype.MESSAGE.RxExtMesgsEnable, new Buffer([filler, ucEnable])), ANTMessage.prototype.MESSAGE.RxExtMesgsEnable.id, errorCallback, successCallback);
    //    else if (typeof this.capabilities !== "undefined" && !this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
    //        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Device does not support extended messages - tried to configure via RxExtMesgsEnable API call");
    //};

    // Spec. p. 77 "This functionality is primarily for determining precedence with multiple search channels that cannot co-exists (Search channels with different networks or RF frequency settings)"
    // This is the case for ANT-FS and ANT+ device profile like i.e HRM
    //Host.prototype.setChannelSearchPriority = function (ucChannelNum, ucSearchPriority, errorCallback, successCallback) {
    //    var self = this, message = new ANTMessage();

    //    this.sendAndVerifyResponseNoError(message.create_message(ANTMessage.prototype.MESSAGE.set_channel_search_priority, new Buffer([ucChannelNum, ucSearchPriority])), ANTMessage.prototype.MESSAGE.set_channel_search_priority.id, errorCallback, successCallback);

    //};


// Unassign a channel. A channel must be unassigned before it may be reassigned. (spec p. 63)
    Host.prototype.unAssignChannel = function (channelNr, callback) {

        var configurationMsg = new UnAssignChannelMessage();

        this.sendMessage(configurationMsg, callback);

    };

/* Reserves channel number and assigns channel type and network number to the channel, sets all other configuration parameters to defaults.
 Assign channel command should be issued before any other channel configuration messages (p. 64 ANT Message Protocol And Usaga Rev 50) ->
 also sets defaults values for RF, period, tx power, search timeout p.22 */
    Host.prototype.assignChannel = function (channelNumber, channelType, networkNumber, extend, callback) {
        var cb, configurationMsg = new AssignChannelMessage(channelNumber, channelType, networkNumber, extend);

        if (typeof extend === "function")
            cb = extend; // If no extended assignment use parameter as callback
        else {
            cb = callback;

            if (typeof this.capabilities === "undefined")
                cb(new Error('getCapabilities should be run to determine capability for extended assign'));

            if (!this.capabilities.advancedOptions2.CAPABILITIES_EXT_ASSIGN_ENABLED)
                cb(new Error('Device does not support extended assignment'));
        }

        this.sendMessage(configurationMsg, cb);

    };

/* Master: id transmitted along with messages Slave: sets channel ID to match the master it wishes to find,  0 = wildecard
"When the device number is fully known the pairing bit is ignored" (spec. p. 65)
*/
    Host.prototype.setChannelId = function (channel, deviceNum, deviceType, transmissionType, callback) {

        var configurationMsg = new SetChannelIDMessage(channel, deviceNum,deviceType,transmissionType);

        this.sendMessage(configurationMsg, callback);

    };

// Uses the lower 2 bytes of the device serial number as channel Id.
    Host.prototype.setSerialNumChannelId = function (channel, deviceType, transmissionType, callback) {

        if (typeof this.capabilities === "undefined")
            callback(new Error('getCapabilities should be run to determine capability for device serial number'));

        if (!this.capabilities.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED)
            callback(new Error('Device does not support serial number - cannot use lower 2 bytes of serial number as device number in the channel ID'));

            var configurationMsg = new SetSerialNumChannelIdMessage(channel, deviceType, transmissionType);

            this.sendMessage(configurationMsg,  callback);

    };

    Host.prototype.setChannelPeriod = function (channel,messagePeriod,callback) {

        //if (channel.isBackgroundSearchChannel())
        //    msg = "(Background search channel)";

        var configurationMsg = new SetChannelPeriodMessage(channel, messagePeriod);

        this.sendMessage(configurationMsg,  callback);

    };

    // Low priority search mode
    // Spec. p. 72 : "...a low priority search will not interrupt other open channels on the device while searching",
    // "If the low priority search times out, the module will switch to high priority mode"
    Host.prototype.setLowPriorityChannelSearchTimeout = function (channel, searchTimeout, callback) {

        // Timeout in sec. : ucSearchTimeout * 2.5 s, 255 = infinite, 0 = disable low priority search


        if (typeof this.capabilities === "undefined")
            callback(new Error('getCapabilities should be run first to determine if device support low priority channel search'));

        if (!this.capabilities.advancedOptions.CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED)
            callback(new Error("Device does not support setting low priority search"));

            var configurationMsg = new SetLowPriorityChannelSearchTimeoutMessage(channel, searchTimeout);

            this.sendMessage(configurationMsg,  callback);

    };

// Set High priority search timeout, each count in searchTimeout = 2.5 s, 255 = infinite, 0 = disable high priority search mode (default search timeout is 25 seconds)
    Host.prototype.setChannelSearchTimeout = function (channel, searchTimeout,callback) {

        var configurationMsg = new SetChannelSearchTimeoutMessage(channel, searchTimeout);

        this.sendMessage(configurationMsg,  callback);

    };

// Set the RF frequency, i.e 66 = 2466 MHz
    Host.prototype.setChannelRFFreq = function (channel, RFFreq, callback) {

        var configurationMsg = new SetChannelRFFreqMessage(channel, RFFreq);

        this.sendMessage(configurationMsg,  callback);

    };

// Set network key for specific net
    Host.prototype.setNetworkKey = function (netNumber, key, callback) {

        var configurationMsg = new SetNetworkKeyMessage(netNumber, key);

        this.sendMessage(configurationMsg, callback);
    };

    // Set transmit power for all channels
//    Host.prototype.setTransmitPower = function (transmitPower, callback) {
//
//        var configurationMsg;
//
//        verifyRange(this.capabilities,'transmitPower', transmitPower,0,4);
//
//        configurationMsg = new SetTransmitPowerMessage(transmitPower);
//
//        this.sendMessage(configurationMsg, callback);
//    };

    // Set transmit power for individual channel
//    Host.prototype.setChannelTxPower = function (channel,transmitPower, callback) {
//
//        if (typeof this.capabilities === "undefined")
//            callback(new Error('getCapabilities should be run first to determine if device has capability for setting individual Tx power for a channel'));
//
//        if (!this.capabilities.advancedOptions.CAPABILITIES_PER_CHANNEL_TX_POWER_ENABLED)
//            callback(new Error('Device does not support setting individual Tx power for a channel'));
//
//            var configurationMsg;
//
//            verifyRange(this.capabilities,'channel', channel);
//            verifyRange(this.capabilities,'transmitPower', transmitPower, 0, 4);
//
//            configurationMsg = new SetChannelTxPowerMessage(channel, transmitPower);
//
//            this.sendMessage(configurationMsg, callback);
//
//    };

    // "Enabled a one-time proximity requirement for searching. Once a proximity searh has been successful, this threshold value will be cleared" (spec. p. 76)
//    Host.prototype.setProximitySearch = function (channel, searchThreshold, callback) {
//
//        if (typeof this.capabilities === "undefined")
//            callback(new Error('getCapabilities should be run first to determine if device has capability for proximity search'));
//
//        if (!this.capabilities.advancedOptions2.CAPABILITIES_PROXY_SEARCH_ENABLED)
//            callback(new Error('Device does not support proximity search'));
//
//            var configurationMsg;
//
//            verifyRange(this.capabilities,'channel', channel);
//            verifyRange(this.capabilities,'searchThreshold', searchThreshold, 0, 10);
//
//            configurationMsg = new SetProximitySearchMessage(channel, searchThreshold);
//
//            this.sendMessage(configurationMsg, callback);
//
//    };



     Host.prototype.openRxScanMode = function (channel, callback) {

        var configurationMsg = new OpenRxScanModeMessage(channel);

        this.sendMessage(configurationMsg, callback);

    };

    // Opens a previously assigned and configured channel. Data messages or events begins to be issued. (spec p. 88)
    Host.prototype.openChannel = function (channel, callback) {

        var configurationMsg = new OpenChannelMessage(channel);

        this.sendMessage(configurationMsg, callback);
    };

    // Close a channel that has been previously opened. Channel still remains assigned and can be reopened at any time. (spec. p 88)
    Host.prototype.closeChannel = function (channelNumber, callback) {

       // Wait for EVENT_CHANNEL_CLOSED ?
       // If channel status is tracking -> can get broadcast data packet before event channel closed packet

        // Do we have a channel configuration available?
        if (this._channel[channelNumber] === undefined)  {
            callback(new Error('Cannot close channel. No channel configuration available for channel ' + channelNumber));
            return;
        }

        var configurationMsg;

        configurationMsg = new CloseChannelMessage(channelNumber);

        this.sendMessage(configurationMsg, callback);

    };

        //Rx:  <Buffer a4 03 40 01 01 05 e2> Channel Response/Event EVENT on channel 1 EVENT_TRANSFER_TX_COMPLETED
        //Rx:  <Buffer a4 03 40 01 01 06 e1> Channel Response/Event EVENT on channel 1 EVENT_TRANSFER_TX_FAILED

    // p. 96 ANT Message protocol and usave rev. 5.0
    // TRANSFER_TX_COMPLETED channel event if successfull, or TX_TRANSFER_FAILED -> msg. failed to reach master or response from master failed to reach the slave -> slave may retry
    // 3rd option : GO_TO_SEARCH is received if channel is dropped -> channel should be unassigned
//    Host.prototype.sendAcknowledgedData = function (ucChannel, pucBroadcastData, errorCallback, successCallback) {
//        var buf = Buffer.concat([new Buffer([ucChannel]), pucBroadcastData.buffer]),
//            self = this,
//            message = new ANTMessage(),
//            ack_msg = message.create_message(ANTMessage.prototype.MESSAGE.acknowledged_data, buf),
//            resendMsg;
//
//        // Add to retry queue -> will only be of length === 1
//        resendMsg = {
//            message: ack_msg,
//            retry: 0,
//            EVENT_TRANSFER_TX_COMPLETED_CB: successCallback,
//            EVENT_TRANSFER_TX_FAILED_CB: errorCallback,
//
//            timestamp: Date.now(),
//
//            retryCB : function _resendAckowledgedDataCB() {
//
//                if (resendMsg.timeoutID)  // If we already have a timeout running, reset
//                    clearTimeout(resendMsg.timeoutID);
//
//                resendMsg.timeoutID = setTimeout(resendMsg.retryCB, 2000);
//                resendMsg.retry++;
//
//                if (resendMsg.retry <= Host.prototype.TX_DEFAULT_RETRY) {
//                    resendMsg.lastRetryTimestamp = Date.now();
//                    // Two-levels of transfer : 1. from app. to ANT via libusb and 2. over RF
//                    self.sendOnly(ack_msg, Host.prototype.ANT_DEFAULT_RETRY, Host.prototype.ANT_DEVICE_TIMEOUT,
//                        function error(err) {
//                            self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Failed to send acknowledged data packet to ANT engine, due to problems with libusb <-> device"+ err);
//                            if (typeof errorCallback === "function")
//                                errorCallback(err);
//                            else
//                                self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No transfer failed callback specified");
//                        },
//                        function success() { self.emit(Host.prototype.EVENT.LOG_MESSAGE, " Sent acknowledged message to ANT engine "+ ack_msg.friendly+" "+ pucBroadcastData.friendly); });
//                } else {
//                    self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Reached maxium number of retries of "+ resendMsg.message.friendly);
//                    if (typeof resendMsg.EVENT_TRANSFER_TX_FAILED_CB === "function")
//                        resendMsg.EVENT_TRANSFER_TX_FAILED_CB();
//                    else
//                        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No EVENT_TRANSFER_TX_FAILED callback specified");
//                }
//            }
//        };
//
//        this.retryQueue[ucChannel].push(resendMsg);
//
//
//        //console.log(Date.now() + " SETTING TIMEOUT ");
//
//        //resendMsg.timeoutCB = function () {
//        //    //console.log(Date.now() + "TIMEOUT HANDLER FOR EVENT_TRANSFER_TX_COMPLETED/FAILED - NOT IMPLEMENTED");
//        //    resendMsg.timeoutRetry++;
//        //    if (resendMsg.timeoutRetry <= Host.prototype.TX_DEFAULT_RETRY)
//        //        send();
//        //    else
//        //        console.log(Date.now() + " Reached maxium number of timeout retries");
//        //};
//
//        resendMsg.retryCB();
//
//    };

//    // Send an individual packet as part of a bulk transfer
//    Host.prototype.sendBurstTransferPacket = function (ucChannelSeq, packet, errorCallback, successCallback) {
//
//        var buf,
//            burst_msg,
//            self = this,
//            message = new ANTMessage();
//
//        buf = Buffer.concat([new Buffer([ucChannelSeq]), packet]);
//
//        burst_msg = message.create_message(ANTMessage.prototype.MESSAGE.burst_transfer_data, buf);
//
//        // Thought : what about transfer rate here? Maybe add timeout if there is a problem will burst buffer overload for the ANT engine
//        // We will get a EVENT_TRANFER_TX_START when the actual transfer over RF starts
//        // p. 102 ANT Message Protocol and Usage rev 5.0 - "it is possible to 'prime' the ANT buffers with 2 (or 8, depending on ANT device) burst packet prior to the next channel period."
//        // "its important that the Host/ANT interface can sustain the maximum 20kbps rate"
//
//        self.sendOnly(burst_msg, Host.prototype.ANT_DEFAULT_RETRY, Host.prototype.ANT_DEVICE_TIMEOUT, errorCallback, successCallback);
//    };
//
//    // p. 98 in spec.
//    // Sends bulk data
//    Host.prototype.sendBurstTransfer = function (ucChannel, pucData, errorCallback, successCallback, messageFriendlyName) {
//        var numberOfPackets = Math.ceil(pucData.length / 8),
//            packetNr,
//            lastPacket = numberOfPackets - 1,
//            sequenceNr,
//            channelNrField,
//            packet,
//            self = this,
//            burstMsg;
//
//        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Burst transfer of "+numberOfPackets+" packets (8-byte) on channel "+ucChannel+", length of payload is "+pucData.length+" bytes");
//
//        // Add to retry queue -> will only be of length === 1
//        burstMsg = {
//            timestamp: Date.now(),
//
//            message: {
//                buffer: pucData,
//                friendlyName: messageFriendlyName
//            },
//
//            retry: 0,
//
//            EVENT_TRANSFER_TX_COMPLETED_CB: successCallback,
//            EVENT_TRANSFER_TX_FAILED_CB: errorCallback,
//
//
//        };
//
//        //console.log(Date.now(), burstMsg);
//
//        this.burstQueue[ucChannel].push(burstMsg);
//
//        var error = function (err) {
//            self.emit(Host.prototype.EVENT.LOG_MESSAGE, " Failed to send burst transfer to ANT engine"+ err);
//        };
//
//        var success = function () {
//            //console.log(Date.now()+ " Sent burst packet to ANT engine for transmission");
//        };
//
//        function sendBurst() {
//
//            if (burstMsg.retry <= Host.prototype.TX_DEFAULT_RETRY) {
//                burstMsg.retry++;
//                burstMsg.lastRetryTimestamp = Date.now();
//
//                for (packetNr = 0; packetNr < numberOfPackets; packetNr++) {
//
//                    sequenceNr = packetNr % 4; // 3-upper bits Rolling from 0-3; 000 001 010 011 000 ....
//
//                    if (packetNr === lastPacket)
//                        sequenceNr = sequenceNr | 0x04;  // Set most significant bit high for last packet, i.e sequenceNr 000 -> 100
//
//                    channelNrField = (sequenceNr << 5) | ucChannel; // Add lower 5 bit (channel nr)
//
//                    // http://nodejs.org/api/buffer.html#buffer_class_method_buffer_concat_list_totallength
//                    if (packetNr === lastPacket)
//                        packet = pucData.slice(packetNr * 8, pucData.length);
//                    else
//                        packet = pucData.slice(packetNr * 8, packetNr * 8 + 8);
//
//                    self.sendBurstTransferPacket(channelNrField, packet,error,success);
//                }
//            } else {
//                self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Reached maximum number of retries of entire burst of "+ burstMsg.message.friendlyName);
//                if (typeof burstMsg.EVENT_TRANSFER_TX_FAILED_CB === "function")
//                    burstMsg.EVENT_TRANSFER_TX_FAILED_CB();
//                else
//                    self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No EVENT_TRANSFER_TX_FAILED callback specified");
//            }
//        }
//
//        burstMsg.retryCB = function retry() { sendBurst(); };
//
//        sendBurst();
//    };

//    if (runFromCommandLine) {
//
//        var noopIntervalID = setInterval(function _noop() { }, 1000 * 60 * 60 * 24);
//        var testCounter = 0;
//        var host = new Host();
//        host.init({
//            vid: 4047,
//            pid: 4104,
//            libconfig: "channelid,rssi,rxtimestamp",
//            //configuration : {
//            //    slaveANTPLUS_ANY: {
//            //        networkKey: ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"],
//            //        channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
//            //        channelId: new ChannelId(ChannelId.prototype.ANY_DEVICE_NUMBER, ChannelId.prototype.ANY_DEVICE_TYPE, ChannelId.prototype.ANY_TRANSMISSION_TYPE),
//            //        RFfrequency: 57,     // 2457 Mhz ANT +
//            //        LPsearchTimeout: 24, // 60 seconds
//            //        HPsearchTimeout: 10, // 25 seconds n*2.5 s
//            //        transmitPower: 3,
//            //        channelPeriod: 8070, // HRM
//            //    }
//            //},
//            //establish : [{
//            //    channel : 0,
//            //    network: 0,
//            //    configuration: "slaveANTPLUS_ANY"
//            //    }]
//
//
//        }, function (error) {
//
//            if (error) {
//                host.emit(Host.prototype.EVENT.ERROR, error);
//                host.usb.on('closed', function () {
//                    clearInterval(noopIntervalID);
//                });
//            } else {
//                //console.log("Host callback");
//                //console.trace();
//            }
//
//        });
//    }

    module.exports = Host;

    return module.exports;
});
