/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true */

//var requirejs = require('requirejs');
//
//requirejs.config({
//    //Pass the top-level main.js/index.js require
//    //function to requirejs so that node modules
//    //are loaded relative to the top-level JS file.
//    nodeRequire: require
//});
//
////requirejs(['events','channel'], function (events,channel)
////          {
////              console.log("events",events,channel);
////          });

// Allows using define in node.js
// Require.js : require({moduleId}) -> {moduleId} translated to a path (using baseUrl+path configuration)

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
'use strict';
   var
    
    // Data
   
    BroadcastDataMessage = require('messages/from/BroadcastDataMessage'),
       
    Logger = require('logger'),
    USBDevice = require('usb/USBDevice'),
    Channel = require('Channel'),
    ANTMessage = require('messages/ANTMessage'),

    // Control ANT
    ResetSystemMessage = require('messages/to/ResetSystemMessage'),
    OpenChannelMessage = require('messages/to/OpenChannelMessage'),
    CloseChannelMessage = require('messages/to/CloseChannelMessage'),

    // Notifications

    NotificationStartup = require('messages/from/NotificationStartup'),
    NotificationSerialError = require('messages/from/NotificationSerialError'),

    // Request -response

    RequestMessage = require('messages/to/RequestMessage'),

        CapabilitiesMessage = require('messages/from/CapabilitiesMessage'),
        ANTVersionMessage = require('messages/from/ANTVersionMessage'),
        DeviceSerialNumberMessage = require('messages/from/DeviceSerialNumberMessage'),

    // Configuration

    AssignChannelMessage = require('messages/to/AssignChannelMessage'),
    UnAssignChannelMessage = require('messages/to/UnAssignChannelMessage'),
    SetChannelIDMessage = require('messages/to/SetChannelIDMessage'),
    SetChannelPeriodMessage = require('messages/to/SetChannelPeriodMessage'),
    SetChannelSearchTimeoutMessage = require('messages/to/SetChannelSearchTimeoutMessage'),
    SetLowPriorityChannelSearchTimeoutMessage = require('messages/to/SetLowPriorityChannelSearchTimeoutMessage'),
    SetChannelRFFreqMessage = require('messages/to/SetChannelRFFreqMessage'),
    SetNetworkKeyMessage = require('messages/to/SetNetworkKeyMessage'),
    SetTransmitPowerMessage = require('messages/to/SetTransmitPowerMessage'),
    SetChannelTxPowerMessage = require('messages/to/SetChannelTxPowerMessage'),
    SetProximitySearchMessage = require('messages/to/SetProximitySearchMessage'),
    SetSerialNumChannelIdMessage = require('messages/to/SetSerialNumChannelIdMessage'),

    // Extended messaging information (channel ID, RSSI and RX timestamp)
    LibConfigMessage = require('messages/to/LibConfigMessage'),
    LibConfig = require('messages/libConfig'),
   

    ChannelResponseMessage = require('messages/from/ChannelResponseMessage'),
    ChannelStatusMessage = require('messages/from/ChannelStatusMessage'),
    
    ChannelId = require('messages/channelId');
    
    
 

  //  DeviceProfile_HRM = require('profiles/deviceProfile_HRM'), // Maybe: move to configuration file

// Host for USB ANT communication
function Host() {
    
    //
    // { { 0 : { 
    //          channel : channel,
    //            status : ..}}}
    //  
    //
    //
    this._channel = {}; 
   
    
//
//    this.retryQueue = {}; // Queue of packets that are sent as acknowledged using the stop-and wait ARQ-paradigm, initialized when parsing capabilities (number of ANT channels of device) -> a retry queue for each channel
//    this.burstQueue = {}; // Queue outgoing burst packets and optionally adds a parser to the burst response

    // Callbacks when response is received for a command
    this.callback = {};
    
    // Timeouts for expected response
    this.resendTimeoutID = {};
    
    // Logging
    this.log = new Logger(false);
    
    // PRIVATE function are hidden here, another approach would be to include them in the prototype, i.e Host.prototype._privateFunc, yet another approach could be to lift it to a module var (must be called with this bound to host instance)
      
 this._responseCallback = function (msg) {
     
     var targetMessageId = msg.id,
         resendMessage = false,
         cb = function (error)
         {
              delete this.callback[targetMessageId];
              msgCallback(error,msg);
         }.bind(this);
     
     // Handle channel response
     
     if (targetMessageId === ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE) {
         targetMessageId = msg.initiatingId; // Initiating message id, i.e libconfig
         this.log.log('log','Initiating message id for channel response is 0x'+targetMessageId.toString(16)+ ' '+ANTMessage.prototype.MESSAGE[targetMessageId],msg);
       
         if (msg.responseCode !== ChannelResponseMessage.prototype.RESPONSE_EVENT_CODES.RESPONSE_NO_ERROR) {
            this.log.log('warn','Normally a response no error is received, but got ',msg.message);
            resendMessage = true;
        }
         
         
     }
     
     if (resendMessage) // Should be resent in _sendMessage
         return;
     
        var msgCallback = this.callback[targetMessageId],
            RESET_DELAY_TIMEOUT = 500; // Allow 500 ms after reset command before continuing;
        
        if (this.resendTimeoutID[targetMessageId]) {
            clearTimeout(this.resendTimeoutID[targetMessageId]);
            delete this.resendTimeoutID[targetMessageId];
        }
        else
          this.log.log('warn','No timeout registered for response '+msg.name);
        
     if (typeof msgCallback !== 'function')
            this.log.log('warn','No callback registered for '+msg +' '+ msg.toString());
        else {
       
         if (targetMessageId === ANTMessage.prototype.MESSAGE.NOTIFICATION_STARTUP)
             setTimeout(cb,RESET_DELAY_TIMEOUT);
         else
             cb(undefined);
        }
      
    }.bind(this);
    
    // Register response callback, its fired during RXparse
    // It also can be considered as a mutex - only allow send of request if there is no previously registered callback for this particular request.
    this._setResponseCallback = function (message,callback)
    {
          var targetMsgId = message.responseId;
        
        // Special handling of messages that have a channel response
        
        if (targetMsgId === ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE)
            targetMsgId = message.id; // Initiating message id, i.e lib config
        
         if (this.callback[targetMsgId] !== undefined) {
              // this.log.log('log','Awaiting response for a previous resetSystem message, this request is ignored');
            callback(new Error('Awaiting response for a previous '+ message.name+' , cannot register a new request callback'));
            return false;
         }
          
          this.callback[targetMsgId] = callback;
             
         
            return true;
        
    }.bind(this); // bind sets the right context for the function, not necessary to use .call(this in function call
  
    // Send a message to ANT
this._sendMessage = function (message,callback) {
    
    if (!this._setResponseCallback(message,callback)) // If response callback is set already, don't allow another request
    {
        this.log.log('warn','Already awaiting response for ',message);
        return;
    }
    
    var timeMsg,
        
        PROCESSING_DELAY = 10,
        TIMEOUT = USBDevice.prototype.ANT_DEVICE_TIMEOUT*2+PROCESSING_DELAY,
        targetMsgId = message.responseId,
        MAX_RETRY = this.options.maxTransferRetries || 5,
        retryNr = 0;
    
    // Set up timer for resend if no response is received
        if (targetMsgId === ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE)
            targetMsgId = message.id; // Initiating message id
    
    if (message.id !== ANTMessage.prototype.MESSAGE.REQUEST) 
       timeMsg = ANTMessage.prototype.MESSAGE[targetMsgId];
    
    else {
        //this.log.log('log','Request message for id 0x',message.responseId.toString(16));
        if (message.responseId)
           timeMsg = ANTMessage.prototype.MESSAGE[message.responseId];
        else
            this.log.log('warn','Message has no responseId',message);
    }
    
    if (timeMsg) {
       // this.log.log('log','Setting performance timer (time-timeEnd) for ',timeMsg);
        this.log.time(timeMsg);
    }


     var usbTransferCB = function (error)
                          {
                              //console.timeEnd('sendMessageUSBtransfer');
                              if (error)
                                  this.log.log('error','TX failed of '+message.toString());
                              
                              // A response callback is already registered in _setResponseCallback to be called during RXparse
                             // callback(error);
                              
                          }.bind(this);
                          
    var transferMessage = function() {

        //this.log.time('sendMessageUSBtransfer');
        if (retryNr === 0)
           this.log.log('log','Sending message ',message);
        else
           this.log.log('warn','Retry '+retryNr+' sending message',message);
        
        this.log.time(ANTMessage.prototype.MESSAGE[message.id]); // Will keep first time on retries
        
        this.resendTimeoutID[targetMsgId] = setTimeout(function _responseTimeoutCB()
                             {
                                    if (this.callback[message.responseId] !== undefined)
                                       this.log.log('warn','No response to request for '+message.name+ ' in '+TIMEOUT+' ms');
                                     
                                     // It should be quite safe to just start a new transfer now (assuming no response from device)
                                     if (++retryNr <= MAX_RETRY) 
                                         transferMessage();

                             }.bind(this),TIMEOUT);
        
        this.usb.transfer(message.getRawMessage(),usbTransferCB);
           
    }.bind(this);

    transferMessage();

}.bind(this);
    
}

//Host.prototype = Object.create(events.EventEmitter.prototype, { constructor : { value : Host,
//                                                                        enumerable : false,
//                                                                        writeable : true,
//                                                                        configurable : true } });

Host.prototype.VERSION = "0.1.0";

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

Host.prototype.getUnAssignedChannel = function () {
    var channelNumber;
};

// Spec. p. 21 sec. 5.3 Establishing a channel
// Assign channel and set channel ID MUST be set before opening
Host.prototype.establishChannel = function (channelInfo, callback, onPageCB) {
    var     channelNumber = channelInfo.channelNumber, 
    networkNumber = channelInfo.networkNumber,
    configurationName = channelInfo.configurationName,
    channel = channelInfo.channel,
    channelPeriod = channelInfo.channelPeriod,
    open = channelInfo.open,
    typeOnPageCB = typeof onPageCB;
    
    // Set onPage callback - for device profile channels
    
    if (typeOnPageCB === 'function') {
        if (typeof channel.setOnPageCB === 'function')
            channel.setOnPageCB(onPageCB);
        else
            this.log.log('warn','Channel has no setOnPageCB function (only for device profile channels)',channel);
    } else if (typeOnPageCB !== 'undefined')
        this.log.log('error','Specified callback for on page from device profile is not a function',onPageCB);
    else if (typeOnPageCB === 'undefined')
        this.log.log('warn','No onPageCB specified - its recommended to specify this callback if you want data pages from device profiles');
    
    var parameters = channel.parameters[configurationName],
        //channelType,
        isMasterChannel = channel.isMaster(configurationName),
        msg;

   this.log.log('log','Establishing channel for configuration', configurationName,parameters, 'Master channel : '+isMasterChannel);

   
    //console.log("Options", parameters);

    verifyRange(this.capabilities,'channel', channelNumber);
    verifyRange(this.capabilities,'network', networkNumber);

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
                break;

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
                this.log.log('error', 'Unknown extended assignment ' + parameters.extendedAssignment);
                parameters.extendedAssignment = undefined;
                break;
        }

    this.log.log('log', 'Establishing ' + channel.showConfiguration(configurationName) + ' C# ' + channelNumber + ' N# ' + networkNumber);

    if (this._channel[channelNumber] === undefined)
        this._channel[channelNumber] = {};
    else
       this.log.log('warn','Overwriting previous channel information for channel C# '+channelNumber,this._channel[channelNumber]); 
    
    this._channel[channelNumber].channel = channel; // Associate channel with particular channel number on host
    this._channel[channelNumber].network = networkNumber;
        
    this.getChannelStatus(channelNumber, function _statusCB(error, statusMsg) {
        if (!error) {

            if (statusMsg.channelStatus.state !== ChannelStatusMessage.prototype.STATE.UN_ASSIGNED) {
                msg = 'Channel ' + channelNumber + ' on network ' + networkNumber + 'is ' + statusMsg.channelStatus.stateMessage;
                this.log.log('log', msg);
                callback(new Error(msg));
                return;
            }

            // MUST have - assign channel + set channel ID

            var assignChannelSetChannelId = function _setNetworkKeyCB() {
                this.assignChannel(channelNumber, parameters.channelType, networkNumber, parameters.extendedAssignment, function _assignCB(error, response) {
                    
                    if (!error) {
                        this.log.log('log', response.toString());
                        //setTimeout(function () {
                        this.setChannelId(channelNumber, parameters.channelId.deviceNumber, parameters.channelId.deviceType, parameters.channelId.transmissionType, function (error, response) {
                            if (!error) {
                                //this.once("assignChannelSetChannelId");

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
                
                if (cPeriod === undefined)
                {
                    callback(new Error('Channel period is undefined'));
                    return;
                }
              
                    this.setChannelPeriod(channelNumber, cPeriod, function (error, response) {
                        if (!error) {
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
                            this.log.log( 'log',response.toString());
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
                        this.log.log('log',response.toString());
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
                
                if (open) {
                    this.openChannel(channelNumber,  function (error, response) {
                        if (!error) {
                            this.log.log('log', response.toString());
                            callback(undefined,channel);
                        }
                        else
                            callback(error,channel);
                    }.bind(this));
                } else callback();
              
            }.bind(this);


        }
        else
            callback(error);
    }.bind(this));
};
    

// Initializes Host
Host.prototype.init = function (options, initCB) {
    // Logging
    this.log.logging = options.log;
    
    this.log.log('log',"Host options",options);
    //console.trace();
    // options : {
    //   vid : 4047,
    //   pid : 4104,
    //   libconfig : "channelId,rxtimestamp" or number
    //   log_usb : true
    //   reset : true
    //   capabilities : true
    // }
    
         var doLibConfig = function (_doLibConfigCB) {
             
                if (!this.options || !this.capabilities) {
                    _doLibConfigCB(new Error('Could not find capabilities for extended messaging'));
                    return;
                }

                var libConfigOptions = this.options.libconfig,
                    libConfig, 
                    libConfigOptionsSplit;

                if (typeof libConfigOptions === "undefined") {
                    this.log.log('warn','No library configuration options specified for extended messaging');
                    _doLibConfigCB(new Error('No library configuration options specified for extended messaging'));
                    return;
         }
         
          if (!this.capabilities.advancedOptions2.CAPABILITIES_EXT_MESSAGE_ENABLED) {
              this.log.log('warn','Device does not have capability for extended messaging');
                _doLibConfigCB(new Error('Device does not have capability for extended messaging'));
                return;
          }
         
         
                libConfig = new LibConfig();


                if (typeof libConfigOptions === 'number')
                    libConfig.setFlagsByte(libConfigOptions);

                else if (typeof libConfigOptions === 'string') { // channelid, rssi, rxtimestamp

                    libConfigOptionsSplit = libConfigOptions.toLowerCase().split(',');

                    if (libConfigOptionsSplit.indexOf("channelid") !== -1)
                        libConfig.setEnableChannelId();

                    if (libConfigOptionsSplit.indexOf("rssi") !== -1)
                        libConfig.setEnableRSSI();

                    if (libConfigOptionsSplit.indexOf("rxtimestamp") !== -1)
                        libConfig.setEnableRXTimestamp();
                }

                else _doLibConfigCB(new Error('Unable to parse library configuration options'));

                //libConfig = new LibConfig(LibConfig.prototype.Flag.CHANNEL_ID_ENABLED, LibConfig.prototype.Flag.RSSI_ENABLED, LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED);
                this.libConfig(libConfig.getFlagsByte(),
                    function (error, serialNumberMsg) {
                        if (!error) {
                            this.libConfig = libConfig;
                            this.log.log('log', libConfig.toString());
                            _doLibConfigCB();
                        }
                        else
                            _doLibConfigCB(error);
                    }.bind(this));
            }.bind(this);

    
    var getANTVersionAndDeviceNumber = function (_getANTVersionAndDeviceNumberCB) {
                    this.getANTVersion(function (error, version) {
                        if (!error) {
                            this.log.log('log', version.toString());

                                this.getDeviceSerialNumber(function (error, serialNumberMsg) {
                                    if (!error) 
                                      this.log.log('log', serialNumberMsg.toString());
                                    
                                    _getANTVersionAndDeviceNumberCB(error);
                               
                    }.bind(this));
                   } else
                       _getANTVersionAndDeviceNumberCB(error);
        }.bind(this));
    }.bind(this);
    
    var getDeviceInfo = function (getDeviceInfoCB) {
        
                this.getCapabilities(function (error, capabilities) {
                    if (!error) {
                     
                      if (!options.reset) {
                        // Get channel status if device is not reset
                        this.getChannelStatusAll(function (error) {
                            if (error)
                                getDeviceInfoCB(error);

                            getANTVersionAndDeviceNumber(function (error) { getDeviceInfoCB(error); });
                         
                            }.bind(this));
                      } else
                          getANTVersionAndDeviceNumber(function (error) { getDeviceInfoCB(error); });
                       
                   } else
                        getDeviceInfoCB(error);

                    }.bind(this));
    }.bind(this);
        
        
     var resetCapabilitiesLibConfig = function _resetSystem(callback) {

        if (options.reset) {
            this.resetSystem(function (error, notification) {
                if (!error) {
                    getDeviceInfo(function (error) { 
                        if (!error)
                          doLibConfig (function (error) { callback(error); });
                        else
                            callback(error);
                    });
                } else {           
                    callback(error);
                }
            }.bind(this));
        }
        else
            getDeviceInfo(function (error) { callback(error); });

    }.bind(this);
        
    
    var usbInitCB = function _usbInitCB(error) {

        if (error)
            initCB(error);
        else
        {
            // Start listening for data on in endpoint and send it to host parser
            // Binding parse callback to this/host, otherwise this is undefined when
            // called from listen in strict mode and this cannot be used in parse
            
            this.usb.listen(this.RXparse.bind(this));
            
            resetCapabilitiesLibConfig(initCB);
        }
        
     }.bind(this);
    
    
    this.options = options;
    
    if (typeof options.maxTransferRetries === 'undefined')
        this.options.maxTransferRetries = 5;
    
    this.usb = options.usb;
   
    this.usb.init(usbInitCB);


};

// Exit host
Host.prototype.exit = function (callback) {
   
    this.usb.exit(callback);

};


Host.prototype.RXparse = function (error,data) {
//    data = new Uint8Array(1);
//    data[0] = 164;
  var message,
      messageLength = data.length, // Uint8Array .length === .byteLength
      SYNC_OFFSET = 0,
      LENGTH_OFFSET = 1,
      ID_OFFSET = 2,
      NUMBER_OF_FIXED_BYTES = 4, // SYNC LENGTH ID CRC
      nextSYNCIndex;
      
     
    if (error) {
        this.log.log('error',error);
        //throw new Error(error);
        return;
    }
    
    //this.log.time('parse');
    
    if (data === undefined)
    {
        this.log.log('error','Undefined data received in RX parser, may indicate problems with USB provider, i.e USBChrome');
        return;
    }
    
   
    // Check for partial message that crosses LIBUSB transfer length boundary (typically multiple of max packet size for in endpoint)
    
    if (this.partialMessage) {
        var firstBufferLength = this.partialMessage.first[LENGTH_OFFSET];
        if (typeof firstBufferLength === 'undefined') // Length is the first byte in new data buffer and SYNC the last byte of the previous buffer
           firstBufferLength = data[0];
        
        this.partialMessage.next = data.subarray(0,firstBufferLength-(this.partialMessage.first.length-NUMBER_OF_FIXED_BYTES));
        this.log.log('log',this.partialMessage);
        message = new Uint8Array(this.partialMessage.first.length+this.partialMessage.next.length);
        message.set(this.partialMessage.first,0);
        message.set(this.partialMessage.next,this.partialMessage.first.length);
        this.log.log('log','Reconstructed ',message);
        
    } else {
         if (typeof data[LENGTH_OFFSET] === 'undefined') {
            this.log.log('warn','No message length found in partial message ',data);
            message = data; // Only 1 SYNC byte
            this.partialMessage = {  first : message };
            return;
        } else {
            message = data.subarray(0,data[LENGTH_OFFSET]+NUMBER_OF_FIXED_BYTES);
            if (message.length < data[LENGTH_OFFSET]+NUMBER_OF_FIXED_BYTES) {
                this.partialMessage = {  first : message };
                return;
            }
        
        }
    }
    

    if (message[SYNC_OFFSET] !== ANTMessage.prototype.SYNC) {
     
         this.log.log('error', 'Invalid SYNC byte '+ message[SYNC_OFFSET] + ' expected '+ ANTMessage.prototype.SYNC+' cannot trust the integrity of data, discarding '+data.length +'bytes, byte offset of buffer ' +data.byteOffset,data,message);
            return;
    }
   
    
    var notification;
   
  
    //// Check CRC

    //if (!CRCOK) {
    //    console.log("CRC failure - allow passthrough");
    //    //this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "CRC failure - verified CRC " + verifiedCRC.toString(16) + " message CRC" + msgCRC.toString(16));
    //    //return;
    //}

    //if (ANTmsg.LENGTH+data.byteOffset < 64) 
      

    switch (message[ID_OFFSET]) 
    {

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
//
//        //    msgStr += ANTMessage.prototype.MESSAGE.broadcast_data.friendly + " ";
//
//        //    channelNr = data[3];
//        //    msgStr += " on channel " + channelNr;
//
//        //    // Parse flagged extended message info. if neccessary
//        //    if (ANTmsg.length > 9) {
//        //        msgFlag = data[12];
//        //        //console.log("Extended msg. flag : 0x"+msgFlag.toString(16));
//        //        this.parse_extended_message(channelNr, data); // i.e channel ID
//        //    }
//
//        //    // Check for updated channel ID to the connected device (ONLY FOR IF CHANNEL ID IS NOT ENABLED IN EXTENDED PACKET INFO)
//
//        //    if (typeof antInstance.channelConfiguration[channelNr].hasUpdatedChannelID === "undefined") {
//
//        //        antInstance.getUpdatedChannelID(channelNr,
//        //            function error() {
//        //                this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Failed to get updated channel ID");
//        //            },
//        //           function success(data) {
//        //               antInstance.channelConfiguration[channelNr].hasUpdatedChannelID = true;
//        //           });
//
//        //    } 
//
//        //    // Call to broadcast handler for channel
//        //    if (!antInstance.channelConfiguration[channelNr].emit(Channel.prototype.EVENT.BROADCAST, data))
//        //        antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE,"No listener for event Channel.prototype.EVENT.BROADCAST on channel "+channelNr);
//
//            //    //antInstance.channelConfiguration[channelNr].broadCastDataParser(data);
//
//            // Example RX broadcast standard message : <Buffer a4 09 4e 01 84 00 5a 64 79 66 40 93 94>
//           
           
            var broadcast = new BroadcastDataMessage(message); 

             //this.log.log('log',this.broadcast.toString(), "Payload",this.broadcast.data, this.broadcast);
//
//            // Question ? Filtering of identical messages should it be done here or delayed to i.e device profile ??
//            // The number of function calls can be limited if filtering is done here....
//
             // Send broad to specific channel handler
            if (typeof this._channel[broadcast.channel] !== "undefined") {
               
                if (typeof this._channel[broadcast.channel].channel.broadCast !== 'function') 
                    this.log.log('warn',"No broadCast function available : on C# " + broadcast.channel);
                else {
                    var page = this._channel[broadcast.channel].channel.broadCast(broadcast);
//                    if (resultBroadcast)
//                        this.log.log('log',resultBroadcast);
                }
            } else
                this.log.log('warn','No channel on host is associated with ' + broadcast.toString()); // Skip parsing of broadcast content
            

            break;

        // Notifications

        case ANTMessage.prototype.MESSAGE.NOTIFICATION_STARTUP:
            
            notification = new NotificationStartup(message);
            this.log.timeEnd(ANTMessage.prototype.MESSAGE[notification.requestId]);
            this.log.log('log',notification.toString());
            this.lastNotificationStartup = notification;
            
//            console.log("Notification startup ",notification);
//            
//            if (this.resendTimeoutID[ANTMessage.prototype.MESSAGE.RESET_SYSTEM]) {
//              clearTimeout(this.resendTimeoutID[ANTMessage.prototype.MESSAGE.RESET_SYSTEM]);
//                delete this.resendTimeoutID[ANTMessage.prototype.MESSAGE.RESET_SYSTEM];
//            }
//            else
//              this.log.log('warn','No timeout registered for response time for reset command');
            
            this._responseCallback(notification);
     
            break;

        case ANTMessage.prototype.MESSAGE.NOTIFICATION_SERIAL_ERROR:

            notification = new NotificationSerialError(message);
            this.lastNotificationError = notification;
            this.log.log('log',"Notification serial error: ",notification.toString());

            break;
//
//            // Channel event or responses
//
        case ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE:

            
            var channelResponseMsg = new ChannelResponseMessage(message);
//            //TEST provoking EVENT_CHANNEL_ACTIVE
//            //data[5] = 0xF;
//            channelResponseMsg.setContent(data.subarray(3, 3 + ANTmsg.length));
//            channelResponseMsg.parse();
            if (channelResponseMsg.initiatingId)
              this.log.timeEnd(ANTMessage.prototype.MESSAGE[channelResponseMsg.initiatingId]);
            
            // Handle channel response for channel configuration commands
            if (!channelResponseMsg.isRFEvent())
                this._responseCallback(channelResponseMsg);
            else
                this.log.log('log',channelResponseMsg.toString(),channelResponseMsg,this._channel);
            
            // Check for channel response callback
           if (typeof this._channel[channelResponseMsg.channel] !== "undefined") {
               
               if (typeof this._channel[channelResponseMsg.channel].channel.channelResponse !== 'function') 
                    this.log.log('warn',"No channelResponse function available : on C# " + channelResponseMsg.channel);
                else {
                  this._channel[channelResponseMsg.channel].channel.channelResponse(channelResponseMsg);
                }

            } else
                this.log.log('log','No channel on host is associated with ' + channelResponseMsg.toString());

            break;
//
//            // Response messages to request 
//
//            // Channel specific 
//
        case ANTMessage.prototype.MESSAGE.CHANNEL_STATUS:
           
            var channelStatusMsg = new ChannelStatusMessage(message);
            this.log.timeEnd(ANTMessage.prototype.MESSAGE[channelStatusMsg.id]);
//            channelStatusMsg.setContent(data.subarray(3, 3 + ANTmsg.length));
//            channelStatusMsg.parse();
            //console.log("status", channelStatusMsg);
            
           this._responseCallback(channelStatusMsg);
            
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
        case ANTMessage.prototype.MESSAGE.ANT_VERSION:

            var versionMsg = new ANTVersionMessage(message);
            this.log.timeEnd(ANTMessage.prototype.MESSAGE[versionMsg.id]);
//            versionMsg.setContent(data.subarray(3, 3 + ANTmsg.length));
//            versionMsg.parse();

            this._responseCallback(versionMsg);

            break;

        case ANTMessage.prototype.MESSAGE.CAPABILITIES:
        
            var capabilitiesMsg = new CapabilitiesMessage(message);
            this.log.timeEnd(ANTMessage.prototype.MESSAGE[capabilitiesMsg.id]);
//            capabilitiesMsg.setContent(data.subarray(3, 3 + ANTmsg.length));
//            capabilitiesMsg.parse();
            
            this.capabilities = capabilitiesMsg;
            
            this.log.log('log',capabilitiesMsg.toString());

            this._responseCallback(capabilitiesMsg);
            
            break;

        case ANTMessage.prototype.MESSAGE.DEVICE_SERIAL_NUMBER:
           
            var serialNumberMsg = new DeviceSerialNumberMessage(message);
             this.log.timeEnd(ANTMessage.prototype.MESSAGE[serialNumberMsg.id]);
//            serialNumberMsg.setContent(data.subarray(3, 3 + ANTmsg.length));
//            serialNumberMsg.parse();
            this.deviceSerialNumber = serialNumberMsg.serialNumber;

            this._responseCallback(serialNumberMsg);

            break;

        default:
            //msgStr += "* NO parser specified *";
            this.log.log('log', "Unable to parse received data",data, ' msg id ',message[ID_OFFSET]);
            break;
    }

    // There might be more buffered messages from LIBUSB available 
    
     
    if (this.partialMessage) {
        nextSYNCIndex = this.partialMessage.next.length;
        this.partialMessage = undefined;
    } else
        nextSYNCIndex = message.length;
    
    if (data.length > nextSYNCIndex)
    {
        //this.log.log('log','Parsing next ANT message, expecting SYNC byte at byteOffset ', nextSYNCIndex,data);
        // console.log(data.slice(nextExpectedSYNCIndex));
        return this.RXparse(undefined,data.subarray(nextSYNCIndex));
    }
    
};
  
// Send a reset device command
Host.prototype.resetSystem = function (callback) {

    var msg = new ResetSystemMessage();
   
        this._sendMessage(msg, callback);
    
};

// Send request for channel ID 
Host.prototype.getChannelId = function (channel, callback) {
    var msg = (new RequestMessage(channel, ANTMessage.prototype.MESSAGE.CHANNEL_ID));

    this._sendMessage(msg, callback);
};

// Send a request for ANT version
Host.prototype.getANTVersion = function (callback) {

    var msg = (new RequestMessage(undefined, ANTMessage.prototype.MESSAGE.ANT_VERSION));

    this._sendMessage(msg,callback);
       
};

// Send a request for device capabilities
Host.prototype.getCapabilities = function (callback) {
   
    var msg = (new RequestMessage(undefined, ANTMessage.prototype.MESSAGE.CAPABILITIES));
    
    this._sendMessage(msg, callback);
    
};

// Send a request for device serial number
Host.prototype.getDeviceSerialNumber = function (callback) {
    
    var fetchSerialNumber = function () { 
        
        if (!this.capabilities.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED)  {
             callback(new Error('Device does not have capability to determine serial number'));
            return;
        }
                            
        var msg = (new RequestMessage(undefined, ANTMessage.prototype.MESSAGE.DEVICE_SERIAL_NUMBER));
                            
         
            this._sendMessage(msg,  callback);
     }.bind(this);

    if (typeof this.capabilities === "undefined")
    {
        this.log.log('warn','Cannot determine if device has capability for serial number - getCapabilities should be run first, attempting to get capabilities now');
        this.getCapabilities(function (error,capabilities) { if (!error) fetchSerialNumber(); else callback(error); });
        
    } else
        fetchSerialNumber();

    
};

// Determine valid channel/network
function verifyRange(capabilities,type, value, low, high) {

    
    if (typeof value === "undefined")
        throw new TypeError('Number specified is undefined');
    
    switch (type) {
        case 'channel':
            
            if (typeof capabilities === "undefined")
        throw new Error("getCabilities should be run to determine max. channels and networks");

            if (capabilities && (value > (capabilities.MAX_CHAN - 1) || value < 0))
                throw new RangeError('Channel nr ' + value + ' out of bounds');

            break;

        case 'network':
            
            if (typeof capabilities === "undefined")
        throw new Error("getCabilities should be run to determine max. channels and networks");
            
            if (capabilities && (value > (capabilities.MAX_NET - 1) || value < 0))
                throw new RangeError('Network nr ' + value + ' out of bounds');

            break;

        case 'transmitPower':

            if (value > high || value < low)
                throw new RangeError('Transmit power out of bounds');

            break;

        case 'searchThreshold':

            if (value > high || value < low)
                throw new RangeError('Proximity search threshold out of bounds');

            break;

        default: throw new Error('Unknown type, cannot verify range');

    }
}

// Send request for channel status, determine state (un-assigned, assigned, searching or tracking)
Host.prototype.getChannelStatus = function (channel, callback) {

    verifyRange(this.capabilities,'channel',channel);
    
    var msg = (new RequestMessage(channel, ANTMessage.prototype.MESSAGE.CHANNEL_STATUS));
    
     this._sendMessage(msg, callback);
 
};



Host.prototype.getChannelStatusAll = function (callback) {
    var channelNumber = 0,
        msg;

    var  singleChannelStatus = function () {
        this.getChannelStatus(channelNumber, function _statusCB(error, statusMsg) {
            if (!error) {
                this._channel[channelNumber].status = statusMsg;

                msg = channelNumber + '       ' + statusMsg.channelStatus.networkNumber + ' '+statusMsg.channelStatus.stateMessage;
                this.log.log('log',msg);
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
    
        this.log.log('log','Channel Network State');
        singleChannelStatus();
    }.bind(this);
    
    
    if (!this.capabilities) {
        this.log.log('warn','Cannot determine max number of channels, capabilities object not available, call .getCapabilities first - trying to getCapabilities now');
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

    this._sendMessage(configurationMsg, callback);
      
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

// Used to validate configuration commands 
    function validateResponseNoError(message,msgRequestId) {
        //console.log("args", arguments);
        if (message instanceof ChannelResponseMessage && message.getRequestMessageId() === msgRequestId && message.getMessageCode() === ChannelResponseMessage.prototype.RESPONSE_EVENT_CODES.RESPONSE_NO_ERROR)
            return true;
        else
            return false;
    }

// Unassign a channel. A channel must be unassigned before it may be reassigned. (spec p. 63)
    Host.prototype.unAssignChannel = function (channelNr, callback) {

        var configurationMsg;

        verifyRange(this.capabilities,'channel', channelNr);

        configurationMsg = new UnAssignChannelMessage();

        this._sendMessage(configurationMsg, callback);
        //function (error, responseMessage) {
        //    if (error)
        //        callback(error)
        //    else
        //        callback(undefined, responseMessage);
        //}.bind(this));
        //, function _validationCB(responseMessage) {
        //            return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        //        });
    };

    Host.prototype.setChannel = function (channelNumber, channel) {
        this._channel[channelNumber] = channel;
    };

/* Reserves channel number and assigns channel type and network number to the channel, sets all other configuration parameters to defaults.
 Assign channel command should be issued before any other channel configuration messages (p. 64 ANT Message Protocol And Usaga Rev 50) ->
 also sets defaults values for RF, period, tx power, search timeout p.22 */
    Host.prototype.assignChannel = function (channelNumber, channelType, networkNumber, extend, callback) {
        var cb, configurationMsg;

        verifyRange(this.capabilities,'channel', channelNumber);

        configurationMsg = new AssignChannelMessage(channelNumber, channelType, networkNumber, extend);

        if (typeof extend === "function")
            cb = extend; // If no extended assignment use parameter as callback
        else {
            cb = callback;

            if (typeof this.capabilities === "undefined")
                cb(new Error('getCapabilities should be run to determine capability for extended assign'));

            if (!this.capabilities.advancedOptions2.CAPABILITIES_EXT_ASSIGN_ENABLED)
                cb(new Error('Device does not support extended assignment'));
        }
        
        this._sendMessage(configurationMsg, cb);
        //, function _validationCB(responseMessage) {
        //    return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        //});

        
    };

/* Master: id transmitted along with messages Slave: sets channel ID to match the master it wishes to find,  0 = wildecard
"When the device number is fully known the pairing bit is ignored" (spec. p. 65)
*/
    Host.prototype.setChannelId = function (channel, deviceNum, deviceType, transmissionType, callback) {

        var configurationMsg;

        verifyRange(this.capabilities,'channel',channel);

        configurationMsg = new SetChannelIDMessage(channel, deviceNum,deviceType,transmissionType);

        this._sendMessage(configurationMsg, callback);

    };

// Uses the lower 2 bytes of the device serial number as channel Id.
    Host.prototype.setSerialNumChannelId = function (channel, deviceType, transmissionType, callback) {

       

        if (typeof this.capabilities === "undefined")
            callback(new Error('getCapabilities should be run to determine capability for device serial number'));

        if (!this.capabilities.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED) 
            callback(new Error('Device does not support serial number - cannot use lower 2 bytes of serial number as device number in the channel ID'));

            var configurationMsg;

            verifyRange(this.capabilities,'channel', channel);

            configurationMsg = new SetSerialNumChannelIdMessage(channel, deviceType, transmissionType);

            this._sendMessage(configurationMsg,  callback);

    };

    Host.prototype.setChannelPeriod = function (channel,messagePeriod,callback) {

        //if (channel.isBackgroundSearchChannel())
        //    msg = "(Background search channel)";

        var configurationMsg;

        verifyRange(this.capabilities,'channel',channel);
        this.log.log('log','Channel period (Tch) is ',messagePeriod);

        configurationMsg = new SetChannelPeriodMessage(channel, messagePeriod);

        this._sendMessage(configurationMsg,  callback);

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
       
            var configurationMsg;

            verifyRange(this.capabilities,'channel', channel);

            configurationMsg = new SetLowPriorityChannelSearchTimeoutMessage(channel, searchTimeout);

            this._sendMessage(configurationMsg,  callback);
           
    };

// Set High priority search timeout, each count in searchTimeout = 2.5 s, 255 = infinite, 0 = disable high priority search mode (default search timeout is 25 seconds)
    Host.prototype.setChannelSearchTimeout = function (channel, searchTimeout,callback) {

        var configurationMsg;

        verifyRange(this.capabilities,'channel',channel);
     
        configurationMsg = new SetChannelSearchTimeoutMessage(channel, searchTimeout);

        this._sendMessage(configurationMsg,  callback);

    };

// Set the RF frequency, i.e 66 = 2466 MHz
    Host.prototype.setChannelRFFreq = function (channel, RFFreq, callback) {

        var configurationMsg;

        verifyRange(this.capabilities,'channel',channel);

        configurationMsg = new SetChannelRFFreqMessage(channel, RFFreq);

        this._sendMessage(configurationMsg,  callback);
    
    };

// Set network key for specific net
    Host.prototype.setNetworkKey = function (netNumber, key, callback) {
      
        var configurationMsg;

        verifyRange(this.capabilities,'network',netNumber);

        configurationMsg = new SetNetworkKeyMessage(netNumber, key);

        this._sendMessage(configurationMsg, callback);
    };

    // Set transmit power for all channels
    Host.prototype.setTransmitPower = function (transmitPower, callback) {

        var configurationMsg;

        verifyRange(this.capabilities,'transmitPower', transmitPower,0,4);

        configurationMsg = new SetTransmitPowerMessage(transmitPower);

        this._sendMessage(configurationMsg, callback);
    };

    // Set transmit power for individual channel
    Host.prototype.setChannelTxPower = function (channel,transmitPower, callback) {

        if (typeof this.capabilities === "undefined")
            callback(new Error('getCapabilities should be run first to determine if device has capability for setting individual Tx power for a channel'));

        if (!this.capabilities.advancedOptions.CAPABILITIES_PER_CHANNEL_TX_POWER_ENABLED)
            callback(new Error('Device does not support setting individual Tx power for a channel'));

            var configurationMsg;

            verifyRange(this.capabilities,'channel', channel);
            verifyRange(this.capabilities,'transmitPower', transmitPower, 0, 4);

            configurationMsg = new SetChannelTxPowerMessage(channel, transmitPower);

            this._sendMessage(configurationMsg, callback);
        
    };

    // "Enabled a one-time proximity requirement for searching. Once a proximity searh has been successful, this threshold value will be cleared" (spec. p. 76)
    Host.prototype.setProximitySearch = function (channel, searchThreshold, callback) {

        if (typeof this.capabilities === "undefined")
            callback(new Error('getCapabilities should be run first to determine if device has capability for proximity search'));

        if (!this.capabilities.advancedOptions2.CAPABILITIES_PROXY_SEARCH_ENABLED) 
            callback(new Error('Device does not support proximity search'));

            var configurationMsg;

            verifyRange(this.capabilities,'channel', channel);
            verifyRange(this.capabilities,'searchThreshold', searchThreshold, 0, 10);

            configurationMsg = new SetProximitySearchMessage(channel, searchThreshold);

            this._sendMessage(configurationMsg, callback);
           
    };

    //Host.prototype.openRxScanMode = function (channelNr, errorCallback, successCallback, noVerifyResponseNoError) {
    //    var openRxScan_channel_msg, self = this, message = new ANTMessage();
    //    var channel = this.channelConfiguration[channelNr];
    //    //self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Opening channel " + channel.number);
    //    openRxScan_channel_msg = message.create_message(ANTMessage.prototype.MESSAGE.open_rx_scan_mode, new Buffer([0]));

    //    this.sendAndVerifyResponseNoError(openRxScan_channel_msg, ANTMessage.prototype.MESSAGE.open_rx_scan_mode.id, errorCallback, successCallback, noVerifyResponseNoError);
    //};

    // Opens a previously assigned and configured channel. Data messages or events begins to be issued. (spec p. 88)
    Host.prototype.openChannel = function (channel, callback) {
     
        var configurationMsg;

        verifyRange(this.capabilities,'channel', channel);

        configurationMsg = new OpenChannelMessage(channel);

        this._sendMessage(configurationMsg, callback);
    };

    // Close a channel that has been previously opened. Channel still remains assigned and can be reopened at any time. (spec. p 88)
    Host.prototype.closeChannel = function (channelNumber, callback) {
        ////console.log("Closing channel "+ucChannel);
        //var close_channel_msg, self = this;
        //var channel = this.channelConfiguration[channelNr], message = new ANTMessage();
        ////console.log("Closing channel " + channel.number);
        //close_channel_msg = message.create_message(ANTMessage.prototype.MESSAGE.close_channel, new Buffer([channel.number]));

        //this.sendOnly(close_channel_msg, Host.prototype.ANT_DEFAULT_RETRY, 500, errorCallback,
        //    function success() {
        //        var retryNr = 0;

        //        function retryEventChannelClosed() {

        //            self.read(500, errorCallback,
        //                function success(data) {
        //                    retryNr = 0;

        //                    if (!self.isEvent(Host.prototype.RESPONSE_EVENT_CODES.EVENT_CHANNEL_CLOSED, data)) {
        //                        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Expected event CHANNEL_CLOSED");
        //                        retryNr++;
        //                        if (retryNr < Host.prototype.ANT_RETRY_ON_CLOSE) {
        //                            self.emit(Host.prototype.EVENT.LOG_MESSAGE,"Discarding "+data.inspect()+" from ANT engine packet queue. Retrying to get EVENT CHANNEL CLOSED from ANT device");
        //                            retryEventChannelClosed();
        //                        }
        //                        else {
        //                            self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Reached maximum number of retries. Aborting.");
        //                            errorCallback();
        //                        }
        //                    }
        //                    else
        //                        successCallback();
        //                });
        //        }

      
        //                                 // Wait for EVENT_CHANNEL_CLOSED
        //                                 // If channel status is tracking -> can get broadcast data packet before channel close packet

       


        //Rx:  <Buffer a4 03 40 01 01 05 e2> Channel Response/Event EVENT on channel 1 EVENT_TRANSFER_TX_COMPLETED
        //Rx:  <Buffer a4 03 40 01 01 06 e1> Channel Response/Event EVENT on channel 1 EVENT_TRANSFER_TX_FAILED

        var configurationMsg;

        verifyRange(this.capabilities,'channel', channelNumber);

        configurationMsg = new CloseChannelMessage(channelNumber);

        // To DO: register event handler for EVENT_CHANNEL_CLOSED before calling callback !!!

        // this._
        // TO DO : create a single function for configuration/control commands that receive RESPONSE_NO_ERROR ?

        this._sendMessage(configurationMsg, callback);

    };

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