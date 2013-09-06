"use strict";

var events = require('events'),
    util = require('util'),
    assert = require('assert'),
    USBDevice = require('./USBNode.js'), // Change to appropiate device
    Channel = require('./channel.js'),
    ANTMessage = require('./messages/ANTMessage.js'),

    Duplex = require('stream').Duplex,

    // Control ANT
    ResetSystemMessage = require('./messages/to//ResetSystemMessage.js'),
    OpenChannelMessage = require('./messages/to/OpenChannelMessage.js'),
    CloseChannelMessage = require('./messages/to/CloseChannelMessage.js'),

    // Notifications

    NotificationStartup = require('./messages/from/NotificationStartup.js'),

    // Request -response

    RequestMessage = require('./messages/to/RequestMessage.js'),

        CapabilitiesMessage = require('./messages/from/CapabilitiesMessage.js'),
        ANTVersionMessage = require('./messages/from/ANTVersionMessage.js'),
        DeviceSerialNumberMessage = require('./messages/from/DeviceSerialNumberMessage.js'),

    // Configuration

    AssignChannelMessage = require('./messages/to/AssignChannelMessage.js'),
    UnAssignChannelMessage = require('./messages/to/UnAssignChannelMessage.js'),
    SetChannelIDMessage = require('./messages/to/SetChannelIDMessage.js'),
    SetChannelPeriodMessage = require('./messages/to/SetChannelPeriodMessage.js'),
    SetChannelSearchTimeoutMessage = require('./messages/to/SetChannelSearchTimeoutMessage.js'),
    SetLowPriorityChannelSearchTimeoutMessage = require('./messages/to/SetLowPriorityChannelSearchTimeoutMessage.js'),
    SetChannelRFFreqMessage = require('./messages/to/SetChannelRFFreqMessage.js'),
    SetNetworkKeyMessage = require('./messages/to/SetNetworkKeyMessage.js'),
    SetTransmitPowerMessage = require('./messages/to/SetTransmitPowerMessage.js'),
    SetChannelTxPowerMessage = require('./messages/to/SetChannelTxPowerMessage.js'),
    SetProximitySearchMessage = require('./messages/to/SetProximitySearchMessage.js'),
    SetSerialNumChannelIdMessage = require('./messages/to/SetSerialNumChannelIdMessage.js'),

    // Extended messaging information (channel ID, RSSI and RX timestamp)
    LibConfigMessage = require('./messages/to/LibConfigMessage.js'),
    LibConfig = require('./libConfig.js'),
   

    ChannelResponseMessage = require('./messages/from/ChannelResponseMessage.js'),
    ChannelStatusMessage = require('./messages/from/ChannelStatusMessage.js'),

    FrameTransform = require('./messages/FrameTransform.js'), // Add SYNC LENGTH and CRC
    DeFrameTransform = require('./messages/DeFrameTransform.js'), // Maybe remove SYNC and CRC and verify message, for now  -> just echo
        
    // Parsing of ANT messages received
    ResponseParser = require('./ANTResponseParser.js'),
        
    ChannelId = require('./channelId.js'),

    DeviceProfile_HRM = require('./profiles/deviceProfile_HRM.js'),

    runFromCommandLine = (require.main === module) ? true : false,
         
    WebSocketManager = require('./profiles/WebSocketManager.js'),
        
    hostCommander = require('commander');


// Host for USB ANT communication, options are for initializing TX/RX stream
function Host(options) {
 
    if (!options)
        Duplex.call(this, { objectMode: true });
    else
        Duplex.call(this, options);
    
    this._channel = []; // Alternative new Array(), jshint recommends []
    this._channelStatus = {};

    this._responseParser = new ResponseParser({ objectMode: true });

    this._responseParser.on(ResponseParser.prototype.EVENT.BROADCAST, this.broadcastData.bind(this));
    this._responseParser.on(ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, this.channelResponseRFevent.bind(this));
   

    this.retryQueue = {}; // Queue of packets that are sent as acknowledged using the stop-and wait ARQ-paradigm, initialized when parsing capabilities (number of ANT channels of device) -> a retry queue for each channel
    this.burstQueue = {}; // Queue outgoing burst packets and optionally adds a parser to the burst response

    this._mutex = {};

    this.on('error', function (msg, err) {
        this.emit(Host.prototype.EVENT.LOG_MESSAGE, msg);
        if (typeof err !== "undefined")
            this.emit(Host.prototype.EVENT.LOG_MESSAGE, err);
    }.bind(this));

    //this.on('finish', function () {
    //    //this.unpipe(); // Remove all pipes
    //    this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Host RX stream finished');
    //}.bind(this));

    //this.on('end', function () {
    //    this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Host TX stream ended');
    //}.bind(this));

    //this.on('unpipe', function () {
    //    this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Host TX stream unpipe');
    //}.bind(this));

    //this.on('pipe', function (src) {
    //    this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Pipe registered into host TX stream');
    //}.bind(this));

    hostCommander.version(Host.prototype.VERSION)
           // .option('-n,--new', 'Download FIT files flagged as new')
            //.option('-l,--list', 'List directory of ANT-FS device')
            //.option('-d,--download <items>', "Download FIT files at index '<n1>,<n2>,...'", list)
            //.option('-a,--download-all', 'Download the entire index of FIT files')
            //.option('-e,--erase <items>', "Erase FIT file at index '<n1>'", list)
            //.option('-b,--background', 'Background search channel for ANT+ devices + websocket server sending ANT+ pages for HRM/SDM4/SPDCAD device profile')
            //.option('-c,--continous', 'Continous scan mode for ANT+ devices + websocket server sending ANT+ pages for HRM/SDM4/SPDCAD device profile')
            .option('-r,--reset', 'Reset ANT device')
            .option('-C,--capabilities', 'List ANT device capabilities')
            .option('-u,--log_usb','Log LIBUSB message, i.e TX/RX buffer to/from ANT')
            .parse(process.argv);
}

util.inherits(Host, Duplex);

Host.prototype.VERSION = "0.1.0";
// Continous scanning channel or background scanning channel
//Host.prototype.SCANNING_CHANNEL_TYPE = {
//    CONTINOUS: 0x00,
//    BACKGROUND: 0x01
//};

//Host.prototype.ANT_DEFAULT_RETRY = 2;

//Host.prototype.ANT_RETRY_ON_CLOSE = 10;  // Potentially get quite a lot of broadcasts in a ANT-FS channel

//Host.prototype.TX_DEFAULT_RETRY = 5; // Retry of RF acknowledged packets (including timeouts)

//Host.prototype.SEARCH_TIMEOUT = {
//    INFINITE_SEARCH: 0xFF,
//    DISABLE_HIGH_PRIORITY_SEARCH_MODE: 0x00
//};

//Host.prototype.ANT_FREQUENCY = 57;

//Host.prototype.ANTFS_FREQUENCY = 50;

// for event emitter
Host.prototype.EVENT = {

    LOG_MESSAGE: 'logMessage',
    ERROR : 'error', 

    //SET_CHANNEL_ID: 'setChannelId',

    // Data
    BROADCAST: 'broadcast',
    BURST: 'burst',

    //CHANNEL_RESPONSE_EVENT : 'channelResponseEvent',

    PAGE : 'page' // Page from ANT+ sensor / device profile

};

Host.prototype.getUnAssignedChannel = function () {
    var channelNumber;
}

// Log message to console
Host.prototype.showLogMessage = function (msg) {
    console.log(msg);
};

Host.prototype.channelResponseRFevent = function (channelResponse) {
    if (typeof this._channel[channelResponse.channel] !== "undefined") {
        if (!this._channel[channelResponse.channel].emit(ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, channelResponse))
            this.emit(Host.prototype.EVENT.LOG_MESSAGE, "No listener for : " + ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT + " on C# " + channelResponse.channel);
    } else
        this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'No channel on host is associated with ' + channelResponse.toString());
};

Host.prototype.broadcastData = function (broadcast) {
    // Send event to specific channel handler
    if (typeof this._channel[broadcast.channel] !== "undefined") {
       
        if (!this._channel[broadcast.channel].emit(ResponseParser.prototype.EVENT.BROADCAST, broadcast))
            this.emit(Host.prototype.EVENT.LOG_MESSAGE, "No listener for : " + ResponseParser.prototype.EVENT.BROADCAST + " on C# " + broadcast.channel);
    } else
        this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'No channel on host is associated with ' + broadcast.toString());
};

// Spec. p. 21 sec. 5.3 Establishing a channel
// Assign channel and set channel ID MUST be set before opening
Host.prototype.establishChannel = function (channelNumber, networkNumber, configurationName, channel, callback) {
    var parameters = channel.parameters[configurationName],
        //channelType,
        masterChannel = channel.isMaster(configurationName),
        msg;

    console.log("Conf.name", configurationName,parameters);

   
    //console.log("Options", parameters);

    verifyRange.bind(this)('channel', channelNumber);
    verifyRange.bind(this)('network', networkNumber);

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
    if (!(parameters.channelId instanceof ChannelId) && !masterChannel) { // Allow for channel Id. object literal with '*' as 0x00

        if (typeof parameters.channelId.deviceNumber === "undefined" || parameters.channelId.deviceNumber === '*' || typeof parameters.channelId.deviceNumber !== 'number')
            parameters.channelId.deviceNumber = 0x00;

        if (typeof parameters.channelId.deviceType === "undefined" || parameters.channelId.deviceType === '*' || typeof parameters.channelId.deviceType !== 'number')
            parameters.channelId.deviceType = 0x00;

        if (typeof parameters.channelId.transmissionType === "undefined" || parameters.channelId.transmissionType === '*' || typeof parameters.channelId.transmissionType !== 'number')
            parameters.channelId.transmissionType = 0x00;

        parameters.channelId = new ChannelId(parameters.channelId.deviceNumber, parameters.channelId.deviceType, parameters.channelId.transmissionType);
    }

    console.log("Master channel", masterChannel);

    // Master - convert declarative syntax to channelId object
    if (!(parameters.channelId instanceof ChannelId) && masterChannel) {

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
                this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Unknown extended assignment ' + parameters.extendedAssignment);
                parameters.extendedAssignment = undefined;
                break;
        }

    this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Establishing ' + channel.showConfiguration(configurationName) + ' C# ' + channelNumber + ' N# ' + networkNumber);

    this._channel[channelNumber] = channel; // Associate channel with particular channel number on host

    this.getChannelStatus(channelNumber, function _statusCB(error, statusMsg) {
        if (!error) {

            if (statusMsg.channelStatus.state !== ChannelStatusMessage.prototype.STATE.UN_ASSIGNED) {
                msg = 'Channel ' + channelNumber + ' on network ' + networkNumber + 'is ' + statusMsg.channelStatus.stateMessage;
                this.emit(Host.prototype.EVENT.LOG_MESSAGE, msg);
                callback(new Error(msg));
                return;
            }

            // MUST have - assign channel + set channel ID

            var assignChannelSetChannelId = function _setNetworkKeyCB() {
                this.assignChannel(channelNumber, parameters.channelType, networkNumber, parameters.extendedAssignment, function _assignCB(error, response) {
                    
                    if (!error) {
                        this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                        //setTimeout(function () {
                        this.setChannelId(channelNumber, parameters.channelId.deviceNumber, parameters.channelId.deviceType, parameters.channelId.transmissionType, function (error, response) {
                            if (!error) {
                                //this.once("assignChannelSetChannelId");

                                this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
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

            ////// Default 8192 = 4 Hz
            var setChannelPeriod = function () {
                if (parameters.channelPeriod)
                    this.setChannelPeriod(channelNumber, parameters.channelPeriod, function (error, response) {
                        if (!error) {
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                            setTransmitPower();
                        }
                        else
                            callback(error);
                    }.bind(this));
                else
                    setTransmitPower();
            }.bind(this);

            // Default 66 = 2466 MHz

            var setChannelRFFreq =  function () {
                if (parameters.RFfrequency)
                    this.setChannelRFFreq(channelNumber, parameters.RFfrequency, function (error, response) {
                        if (!error) {
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                            setChannelPeriod();
                        }
                        else
                            callback(error);
                    }.bind(this));
                else
                    setChannelPeriod();
               
            }.bind(this);

            //// Default 3 = 0bDm

            var setTransmitPower = function () {
                if (parameters.transmitPower)
                    this.setTransmitPower(parameters.transmitPower, function (error, response) {
                        if (!error) {
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                            setChannelTxPower();
                        }
                        else
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, error);
                    }.bind(this));
                else
                    setChannelTxPower();
            }.bind(this);

            var setChannelTxPower = function () {
                if (parameters.channelTxPower)
                    this.setChannelTxPower(channelNumber,parameters.channelTxPower, function (error, response) {
                        if (!error) {
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                            setChannelSearchTimeout();
                        }
                        else
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, error);
                    }.bind(this));
                else
                    setChannelSearchTimeout();
            }.bind(this);

            // Optional

            if (parameters.networkKey)

                this.setNetworkKey(networkNumber, parameters.networkKey, function _setNetworkKeyCB(error, response) {
                    if (!error) {
                        this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                        assignChannelSetChannelId();
                    }
                    else
                        callback(error);
                }.bind(this));
            else
                assignChannelSetChannelId();

            //// Optional

            //// SLAVE SEARCH TIMEOUTS : high priority and low priority
            
            //    this.emit(Host.prototype.EVENT.LOG_MESSAGE,"Channel "+channelNumber+" type "+ Channel.prototype.TYPE[parameters.channelType]);

            var setChannelSearchTimeout = function () {
                // Default HP = 10 -> 25 seconds
                if (!masterChannel && parameters.HPsearchTimeout) 
                    this.setChannelSearchTimeout(channelNumber, parameters.HPsearchTimeout, function (error, response) {
                        if (!error) {
                            setLowPriorityChannelSearchTimeout();
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                        }
                        else
                            callback(error);
                    }.bind(this));
                else
                    setLowPriorityChannelSearchTimeout();
            }.bind(this);
        
            var setLowPriorityChannelSearchTimeout = function () {
                // Default LP = 2 -> 5 seconds
                if (!masterChannel && parameters.LPsearchTimeout) 
                    this.setLowPriorityChannelSearchTimeout(channelNumber, parameters.LPsearchTimeout, function (error, response) {
                        if (!error) {
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                            setProximitySearch();
                        }
                        else
                            callback(error);
                    }.bind(this));
                else
                    setProximitySearch();
            }.bind(this);

            var setProximitySearch = function () {
                if (parameters.proximitySearch)
                    this.setProximitySearch(channelNumber, parameters.proximitySearch, function (error, response) {
                        if (!error) {
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                            openChannel();
                        }
                        else
                            callback(error);
                    }.bind(this));
                else
                    openChannel();
            }.bind(this);


            var openChannel = function () {
               
                    this.openChannel(channelNumber,  function (error, response) {
                        if (!error) {
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                            callback();
                        }
                        else
                            callback(error);
                    }.bind(this));
              
            }.bind(this);


        }
        else
            callback(error);
    }.bind(this));
};

// Must be defined/overridden otherwise throws error "not implemented"
// _read-function is used to generate data when the consumer wants to read them
// https://github.com/substack/stream-handbook#creating-a-readable-stream
// https://github.com/joyent/node/blob/master/lib/_stream_readable.js
Host.prototype._read = function (size) {
   // console.trace();
   // console.log("Host: Consumer wants to read %d bytes", size);
    //console.log(this._TXstream._readableState.buffer,size); // .buffer is an array of buffers [buf1,buf2,....] based on whats pushed 
    // this.readable.push('A');
};

Host.prototype._write = function (payload,encoding,nextCB) {
    //console.trace();
   // console.log("Host: _write", arguments,payload);
    this._responseParser.write(payload);
    nextCB();
}


// Initializes TX/RX streams
//function initStream() {
//    // https://github.com/joyent/node/blob/master/lib/_stream_duplex.js
//    this._TXstream = new Duplex({objectMode : true}); // Default highWaterMark = 16384 bytes
//    this._RXstream = new Duplex(); // Cannot pipe into ._TXstream -> will create a loop, must have separate stream to pipe into

//    //this._RXstream = new Writable();

//    // Must be defined/overridden otherwise throws error "not implemented"
//    // _read-function is used to generate data when the consumer wants to read them
//    // https://github.com/substack/stream-handbook#creating-a-readable-stream
//    // https://github.com/joyent/node/blob/master/lib/_stream_readable.js
//    this._TXstream._read = function (size) {
//        //console.trace();
//        //console.log("Host read %d bytes", size);
//        //console.log(this._TXstream._readableState.buffer,size); // .buffer is an array of buffers [buf1,buf2,....] based on whats pushed 
//        // this.readable.push('A');
//    }.bind(this);

//    this._RXstream._read = function (size) {
//        //console.trace();
//        //console.log("_RXstream._read read %d bytes", size);
//        //console.log(this._RXstream._readableState.buffer,size); // .buffer is an array of buffers [buf1,buf2,....] based on whats pushed 
//    }.bind(this);

//    //this._TXstream.pipe(process.stdout);

//    // http://nodejs.org/api/stream.html#stream_class_stream_readable
//    // "If you just want to get all the data out of the stream as fast as possible, this is the best way to do so."
//    // This is socalled "FLOW"-mode (no need to make a manual call to .read to get data from internal buffer)
//    // https://github.com/substack/stream-handbook
//    //Note that whenever you register a "data" listener, you put the stream into compatability mode so you lose the benefits of the new streams2 api.
//    //this._TXstream.addListener('data', function _streamDataListener(response) {
//    //    console.log(Date.now(), 'Stream RX:', response);
//    //    this.parse_response(response);
//    //}.bind(this));

//    // 'readable' event signals that data is available in the internal buffer list that can be consumed with .read call

//    //this._TXstream.addListener('readable', function () {
//    //    var buf;
//    //    // console.log("**************************readable", arguments);
//    //    // console.log("TX:",this._TXstream._readableState.buffer)
//    //    //buf = this._TXstream.read();
//    //    // console.log(Date.now(), 'Stream TX test:', buf);

//    //    //this.parse_response(buf);
//    //    // this._TXstream.unshift(buf);
//    //}.bind(this));


// Initializes USB device and set up of TX/RX stream pipes
Host.prototype.init = function (options, _initCB) {

    //console.trace();
    // options : {
    //   vid : 4047,
    //   pid : 4104,
    //   libconfig : "channelId,rxtimestamp" or number
    //   log_usb : true
    //   reset : true
    //   capabilities : true
    // }
    this.options = options;

    var vendor, product;
    if (typeof options === "undefined") {
        vendor = 4047;
        product = 4104;
    }
    else {
        vendor = options.vid || 4047, // Default to USB 2
        product = options.pid || 4104;
    }
    process.on('SIGINT', function _sigintCB() {
        this.exit(function _exitCB(error) {
            if (typeof this.webSocketManager !== "undefined") {
                       this.emit(Host.prototype.EVENT.LOG_MESSAGE,"Closing websocket server");
                        this.webSocketManager.close();
                 }
            //console.log("SIGINT");
            //console.trace();
            if (!error)
                this.emit(Host.prototype.EVENT.LOG_MESSAGE,"USB connection to ANT device closed. Exiting.");
            _initCB(error);
        }.bind(this));
    }.bind(this));

    this.webSocketManager = new WebSocketManager("localhost", 8093);
   

    this.usb = new USBDevice();
    this.usb.setLogging(hostCommander.log_usb || options.log_usb);

    // Object mode is enabled to allow for passing message objects downstream/TX, from here the message is transformed into a buffer and sent down the pipe to usb
    // Sending directly to the usb as a buffer would have been more performant
    this.frameTransform = new FrameTransform({ objectMode: true }); // TX

    this.deframeTransform = new DeFrameTransform({ highWaterMark: 0 }); // RX, don't want any buffer on reception -> highWaterMark = 0

    this.addListener(Host.prototype.EVENT.LOG_MESSAGE, this.showLogMessage);
    //this.addListener(Host.prototype.EVENT.ERROR, this.showLogMessage);

    this._responseParser.addListener(ResponseParser.prototype.EVENT.NOTIFICATION_SERIAL_ERROR, function (notification) {
        //_initCB(new Error(notification.toString()));
        this.emit(Host.prototype.EVENT.LOG_MESSAGE, notification.toString());
    }.bind(this));

  

    this.usb.init(vendor, product, function _usbInitCB(error) {

        var resetCapabilitiesLibConfig = function _resetSystem(callback) {


            var doLibConfig = function (_doLibConfigCB) {
                if (!this.options || !this.capabilities)
                    _doLibConfigCB();

                var libConfigOptions = this.options.libconfig,
                    libConfig, libConfigOptionsSplit;

                if (typeof libConfigOptions === "undefined" || !this.capabilities.advancedOptions2.CAPABILITIES_EXT_MESSAGE_ENABLED)
                    _doLibConfigCB();

                libConfig = new LibConfig();


                if (typeof libConfigOptions === 'number')
                    libConfig.setFlagsByte(libConfigOptions);

                else if (typeof libConfigOptions === 'string') {

                    libConfigOptionsSplit = libConfigOptions.toLowerCase().split(',');

                    if (libConfigOptionsSplit.indexOf("channelid") !== -1)
                        libConfig.setEnableChannelId();

                    if (libConfigOptionsSplit.indexOf("rssi") !== -1)
                        libConfig.setEnableRSSI();

                    if (libConfigOptionsSplit.indexOf("rxtimestamp") !== -1)
                        libConfig.setEnableRXTimestamp();
                }

                else _doLibConfigCB();

                //libConfig = new LibConfig(LibConfig.prototype.Flag.CHANNEL_ID_ENABLED, LibConfig.prototype.Flag.RSSI_ENABLED, LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED);
                this.libConfig(libConfig.getFlagsByte(),
                    function (error, serialNumberMsg) {
                        if (!error) {
                            this.libConfig = libConfig;
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, libConfig.toString());
                            _doLibConfigCB();
                        }
                        else
                            _doLibConfigCB(error);
                    }.bind(this));
            }.bind(this);

            var getDeviceInfo = function (_getDeviceInfoCB) {

                var getANTVersionAndDeviceNumber = function (_getANTVersionAndDeviceNumberCB) {
                    this.getANTVersion(function (error, version) {
                        if (!error) {
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, version.toString());

                                this.getDeviceSerialNumber(function (error, serialNumberMsg) {
                                    if (!error) {
                                        this.deviceSerialNumber = serialNumberMsg.serialNumber;
                                        this.emit(Host.prototype.EVENT.LOG_MESSAGE, serialNumberMsg.toString());
                                        //doLibConfig.bind(this)(function (error) {
                                        //    _getDeviceInfoCB(error);
                                        //});
                                        _getANTVersionAndDeviceNumberCB();
                                        //callback();
                                    } else
                                        //_initCB(error);
                                        _getANTVersionAndDeviceNumberCB(error);
                                }.bind(this));
                        } else
                            _getANTVersionAndDeviceNumberCB(error);
                    }.bind(this));
                }.bind(this);

                this.getCapabilities(function (error, capabilities) {
                    if (!error) {
                        this.capabilities = capabilities;

                        if (hostCommander.capabilities || options.capabilities) 
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, capabilities.toString());
                        
                        this.getChannelStatusAll(function (error) {
                            if (error)
                                _getDeviceInfoCB(error);

                            getANTVersionAndDeviceNumber(function (error) {
                                if (error)
                                    _getDeviceInfoCB(error);
                                
                                this.getChannelId(1,function (error, channelId) {
                                    
                                    _getDeviceInfoCB(error);

                                })
                            }.bind(this))
                        
                        }.bind(this));
                    } else
                        _getDeviceInfoCB(error);
                }.bind(this));
            }.bind(this);

            if (hostCommander.reset || options.reset) {
                this.resetSystem(function (error, notification) {
                    if (!error) {
                        this.emit(Host.prototype.EVENT.LOG_MESSAGE, notification.toString());
                        this.startupNotification = notification;
                        getDeviceInfo(function (error) { callback(error); });
                    } else
                        callback(error);
                }.bind(this));
            }
            else
                getDeviceInfo(function (error) { callback(error); });

        }.bind(this);

        // Normally get a timeout after draining 
        if (this.usb.isTimeoutError(error)) {

            // TX: Wire outgoing pipes host -> frame transform -> usb
            this.pipe(this.frameTransform).pipe(this.usb);

            // RX: Wire incoming pipes usb -> deframe transf. -> host
           // this.usb.pipe(this.deframeTransform).pipe(this._RXstream).pipe(this._responseParser);
            this.usb.pipe(this.deframeTransform).pipe(this);

            this.usb.listen(function _USBListenCB(error) {

                if (error)

                    _initCB(error);

                else {

                    resetCapabilitiesLibConfig(function (error) {
                        if (!error) {
                            var HRMChannel = new DeviceProfile_HRM();
                            HRMChannel.addListener(Host.prototype.EVENT.PAGE, function (page) { this.webSocketManager.broadcast(page); }.bind(this));
                            //HRMChannel.broadcastHandler = function (broadcast) {

                            //}


                            //HRMChannel.addConfiguration("slave", {
                            //    networkKey: ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"],
                            //    //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
                            //    channelType: "slave",
                            //    channelId:  { deviceNumber : '*', deviceType : '*', transmissionType : '*' },
                            //    RFfrequency: 57,     // 2457 Mhz ANT +
                            //    LPsearchTimeout: 24, // 60 seconds
                            //    HPsearchTimeout: 10, // 25 seconds n*2.5 s
                            //    //transmitPower: 3,
                            //    //channelTxPower : 3,
                            //    channelPeriod: 8070, // HRM
                            //    //channelPeriod : 8086, //SPDCAD
                            //    proximitySearch : 10   // 0 - disabled 1 (nearest) - 10 (farthest)

                            //});
                            //console.log("Test channel", HRMChannel);
                            this.establishChannel(2, 1, "slave", HRMChannel, function (error) {
                                if (!error)
                                    //this.establishChannel(0, 0, "slave", HRMChannel, function (error) {
                                    //    if (!error)
                                    _initCB();
                                    //    else
                                    //        _initCB(error);
                                    //}.bind(this));
                                else
                                    _initCB(error);
                            }.bind(this));
                        } else
                            _initCB(error);
                    }.bind(this));
                }
            }.bind(this));
        } else if (runFromCommandLine && error)
            process.emit('SIGINT');
       
    }.bind(this));

};

// Exit USB device and closes/end TX/RX stream
Host.prototype.exit = function (callback) {
    // console.log("Inside exit ANT");

    // Finish RX stream
    //this._RXstream.end(null)
    // TEST : [Error: write after end]
    //this._RXstream.write(new Buffer(10));

    // End TX stream, close RX stream
    this.push(null);
    this.end();
    // TEST EOF readable stream : this._TXstream.push(new Buffer(10)); 
    //-> gives [Error: stream.push() after EOF]

    // Exit USB

    this.usb.exit(callback);

};

// Send a reset device command
Host.prototype.resetSystem = function (callback) {

    var RESET_DELAY_TIMEOUT = 500; // Allow 500 ms after reset command before continuing with callbacks...
    var msg = new ResetSystemMessage();

    sendMessage.bind(this)(msg, ResponseParser.prototype.EVENT.NOTIFICATION_STARTUP, function (error, message) {
        setTimeout(callback.bind(this), RESET_DELAY_TIMEOUT, error, message);
    }.bind(this));
};

// Send request for channel ID 
Host.prototype.getChannelId = function (channel, callback) {
    var msg = (new RequestMessage(channel, ANTMessage.prototype.MESSAGE.CHANNEL_ID));

    sendMessage.bind(this)(msg, ResponseParser.prototype.EVENT.CHANNEL_ID, callback);
}

// Send a request for ANT version
Host.prototype.getANTVersion = function (callback) {

    var msg = (new RequestMessage(undefined, ANTMessage.prototype.MESSAGE.ANT_VERSION));

    sendMessage.bind(this)(msg, ResponseParser.prototype.EVENT.ANT_VERSION, callback);
       
};

// Send a request for device capabilities
Host.prototype.getCapabilities = function (callback) {

    var msg = (new RequestMessage(undefined, ANTMessage.prototype.MESSAGE.CAPABILITIES));

    sendMessage.bind(this)(msg, ResponseParser.prototype.EVENT.CAPABILITIES, callback);
        
};

// Send a request for device serial number
Host.prototype.getDeviceSerialNumber = function (callback) {

    if (typeof this.capabilities === "undefined")
        callback(new Error('Cannot determine if device has capability for serial number - getCapabilities should be run first'));

    if (!this.capabilities.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED) 
        callback(new Error('Device does not have capability to determine serial number'));

    var msg = (new RequestMessage(undefined, ANTMessage.prototype.MESSAGE.DEVICE_SERIAL_NUMBER));

        sendMessage.bind(this)(msg, ResponseParser.prototype.EVENT.DEVICE_SERIAL_NUMBER, callback);
    
};

// Determine valid channel/network
function verifyRange(type, value, low, high) {

    if (typeof this.capabilities === "undefined")
        throw new Error("getCabilities should be run to determine max. channels and networks");

    if (typeof value === "undefined")
        throw new TypeError('Number specified is undefined');
    
    switch (type) {
        case 'channel':

            if (this.capabilities && (value > (this.capabilities.MAX_CHAN - 1) || value < 0))
                throw new RangeError('Channel nr ' + value + ' out of bounds');

            break;

        case 'network':
            if (this.capabilities && (value > (this.capabilities.MAX_NET - 1) || value < 0))
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

    verifyRange.bind(this)('channel',channel);

    var msg = (new RequestMessage(channel, ANTMessage.prototype.MESSAGE.CHANNEL_STATUS));

    sendMessage.bind(this)(msg,ResponseParser.prototype.EVENT.CHANNEL_STATUS,callback);
       
};

// Send a message, if a reply is not received, it will retry for 500ms. 
function sendMessage(sendMessage,event,callback) {

    var timeoutRetryMessageID,
        timeoutMessageFailID,
        WAIT_FOR_RESPONSE_TIME = 500, // Wait 500 ms before creating error for failed response from ANT

        // Listener for responses on event
        listener = function (responseMessage, channel, requestMsgId, msgCode) {
            //console.log("LISTENER CALLED",responseMessage.name);

                        var processCB = function _processCB() {
                       
                                                this._responseParser.removeListener(event, listener);
               
                                                clearTimeout(timeoutRetryMessageID);
                                                clearTimeout(timeoutMessageFailID);
               
                                                callback(undefined, responseMessage);
                                        }.bind(this);


                        // If we got RESPONSE_NO_ERROR on sendMessage channel
                        if (typeof sendMessage.channel !== "undefined" && event === ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT &&
                            sendMessage.channel === channel && sendMessage.id === requestMsgId && msgCode === ChannelResponseMessage.prototype.RESPONSE_EVENT_CODES.RESPONSE_NO_ERROR) {
                            processCB();
                        } // RESPONSE_NO_ERROR for message without channel, i.e setTransmitPower - using filler byte reported reply on channel 0
                        else if (event === ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT &&
                            sendMessage.id === requestMsgId && msgCode === ChannelResponseMessage.prototype.RESPONSE_EVENT_CODES.RESPONSE_NO_ERROR)
                            processCB();
                        else if (event !== ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT) // i.e notification startup
                            processCB();

            }.bind(this);
   
    this._responseParser.on(event, listener);

    var estimatedRoundtripDelayForMessage = this.usb.getDirectANTChipCommunicationTimeout() * 2 + 5;
    //var estimatedRoundtripDelayForMessage = 1000;

    timeoutMessageFailID = setTimeout(function () {
       // console.log("ERROR TIMEOUT")
        this._responseParser.removeListener(event, listener);
        clearTimeout(timeoutRetryMessageID);

        //// This is mentioned in the spec., but probably occurs very rarely
        //// http://www.thisisant.com/forum/viewthread/4061/
        //// Flush ANT receive buffer - send 15 zero's

        ////var zeroMsg = new ANTMessage();
        ////zeroMsg.id = 0x00;
            
        //var MAXBUFLEN = 15, zeroBuffer = new Buffer(MAXBUFLEN), errMsg = 'No event ' + event + ' for message ' + sendMessage.name + " in " + MAX_TIMESTAMP_DIFF + " ms.";
            
        //for (var i = 0; i < MAXBUFLEN; i++)
        //    zeroBuffer[i] = 0;
        ////zeroMsg.setContent(zeroBuffer);

        //// zeroMsg length is 24 bytes now
        //// NO SYNC gives Notification Serial Error - First byte not SYNC
        //// Longer than 24 bytes -> Notification Serial Error - ANT Message too long
        //this.usb.write(zeroBuffer, function (error) {
        //    if (!error)
        //        this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Sent - 15 zero to ANT chip - Reset ANT receive state machine');
        //    else
        //        this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Failed : Reset ANT receive state machine ' +error);

        //    // Timeout in case of notification serial errors propagated back via response parser
        //    setTimeout(function () { callback(new Error(errMsg)) }, estimatedRoundtripDelayForMessage);

        //}.bind(this));
       
        //console.log("msg",sendMessage);
        callback(new Error('Message failed ' + sendMessage.name));
       
    }.bind(this), WAIT_FOR_RESPONSE_TIME);

    function retry() {
       
      // TX -> generates a "readable" thats piped into FrameTransform
        if (!this.push(sendMessage))
            this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'TX stream indicates overflow, attempt to push data beyond highWaterMark');
       
            // http://nodejs.org/api/timers.html - Reason for timeout - don't call retry before estimated arrival for response
        timeoutRetryMessageID = setTimeout(function _retryTimerCB() { setImmediate(retry.bind(this)); }.bind(this), estimatedRoundtripDelayForMessage);
       
    }

    retry.bind(this)();

}



// Called on first receive of broadcast from device/master
//Host.prototype.getUpdatedChannelID = function (channel, errorCallback, successCallback) {
//    var msgId, self = this;

//    self.sendOnly(self.request(channel, ANTMessage.prototype.MESSAGE.set_channel_id.id),
//        Host.prototype.ANT_DEFAULT_RETRY, Host.prototype.ANT_DEVICE_TIMEOUT,
//        //function validation(data) { msgId = data[2]; return (msgId === ANT_MESSAGE.set_channel_id.id); },
//        function error(err) {
//            if (typeof errorCallback === "function")
//                errorCallback(err);
//            else
//                self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Found no error callback");
//        },
//        function success() {
//            self.read(Host.prototype.ANT_DEVICE_TIMEOUT, errorCallback,
//               function success(data) {
//                   var msgId = data[2];
//                   if (msgId !== ANTMessage.prototype.MESSAGE.set_channel_id.id)
//                       self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Expected set channel id message response");
//                   self.parse_response(data);
//                   if (typeof successCallback === "function")
//                       successCallback(data);
//                   else
//                       self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Found no success callback");
//               });
//        });
//};




Host.prototype.getChannelStatusAll = function (callback) {
    var channelNumber = 0,
        msg;

    if (!this.capabilities)
        callback(new Error('Cannot determine max number of channels, capabilities object not available, run .getCapabilities first'));

    function singleChannelStatus() {
        this.getChannelStatus(channelNumber, function _statusCB(error, statusMsg) {
            if (!error) {
                this._channelStatus[channelNumber] = statusMsg;

                msg = channelNumber + '       ' + statusMsg.channelStatus.networkNumber + '       '+ statusMsg.channelStatus.stateMessage;
                this.emit(Host.prototype.EVENT.LOG_MESSAGE, msg);
                channelNumber++;
                if (channelNumber < this.capabilities.MAX_CHAN)
                    singleChannelStatus.bind(this)();
                else {
                   
                    callback();
                }
            }
            else
                callback(error);
        }.bind(this));
    };

    this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Channel Network State');
    singleChannelStatus.bind(this)();
}

    // Iterates from channelNrSeed and optionally closes channel
    //Host.prototype.iterateChannelStatus = function (channelNrSeed, closeChannel, iterationFinishedCB) {
    //    var self = this;

    //    self.getChannelStatus(channelNrSeed, function error() {
    //        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Could not retrive channel status");
    //    },
    //        function success() {

    //            //if (self.channelConfiguration[channelNrSeed].channelStatus.channelState === Host.prototype.CHANNEL_STATUS.SEARCHING ||
    //            //    self.channelConfiguration[channelNrSeed].channelStatus.channelState === Host.prototype.CHANNEL_STATUS.TRACKING)
    //            //    console.log(self.channelConfiguration[channelNrSeed].channelStatus.toString());

    //            function reIterate() {
    //                ++channelNrSeed;
    //                if (channelNrSeed < self.capabilities.MAX_CHAN)
    //                    self.iterateChannelStatus(channelNrSeed, closeChannel, iterationFinishedCB);
    //                else {
    //                    if (typeof iterationFinishedCB === "function")
    //                        iterationFinishedCB();
    //                    else
    //                        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No iteration on channel status callback specified");
    //                }
    //            }

    //            if (closeChannel && (self.channelConfiguration[channelNrSeed].channelStatus.channelState === Host.prototype.CHANNEL_STATUS.SEARCHING ||
    //                   self.channelConfiguration[channelNrSeed].channelStatus.channelState === Host.prototype.CHANNEL_STATUS.TRACKING))
    //                self.close(channelNrSeed, function error(err) {
    //                    self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Could not close channel "+ err);
    //                },
    //                    function success() {
    //                        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Channel " + channelNrSeed + " CLOSED.");
    //                        reIterate();
    //                    });
    //            else
    //                reIterate();
    //        });

    //};

    // Associates a channel with a channel configuration
    //Host.prototype.setChannelConfiguration = function (channel) {
    //    var self = this;
    //    //console.trace();

    //    //console.log(Date.now() + "Configuration of channel nr ", channel.number);

    //    if (typeof self.channelConfiguration === "undefined") {
    //        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No channel configuration object available to attach channel to. getCapabilities should be run beforehand to get max. available channels for device");
    //        return;
    //    }

    //    self.channelConfiguration[channel.number] = channel;
    //    //console.log("CHANNEL CONFIGURATION",self.channelConfiguration);
    //},

    // Spec p. 75 "If supported, when this setting is enabled ANT will include the channel ID, RSSI, or timestamp data with the messages"
    // 0 - Disabled, 0x20 = Enable RX timestamp output, 0x40 - Enable RSSI output, 0x80 - Enabled Channel ID output
    Host.prototype.libConfig = function (libConfig, callback) {
      
        assert.equal(typeof this.capabilities, "object", "Capabilities not available");
        assert.ok(this.capabilities.advancedOptions2.CAPABILITIES_EXT_MESSAGE_ENABLED, "Extended messaging not supported on device");

     var configurationMsg;

        configurationMsg = new LibConfigMessage(libConfig);

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);
     
   
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

        verifyRange.bind(this)('channel', channelNr);

        configurationMsg = new UnAssignChannelMessage();

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);
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
    Host.prototype.assignChannel = function (channelNr, channelType, networkNumber, extend, callback) {
        var cb, configurationMsg;

        verifyRange.bind(this)('channel', channelNr);

        configurationMsg = new AssignChannelMessage(channelNr, channelType, networkNumber, extend);

        if (typeof extend === "function")
            cb = extend; // If no extended assignment use parameter as callback
        else {
            cb = callback;

            if (typeof this.capabilities === "undefined")
                cb(new Error('getCapabilities should be run to determine capability for extended assign'));

            if (!this.capabilities.advancedOptions2.CAPABILITIES_EXT_ASSIGN_ENABLED)
                cb(new Error('Device does not support extended assignment'));
        }

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, cb);
        //, function _validationCB(responseMessage) {
        //    return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        //});

        
    };


/* Master: id transmitted along with messages Slave: sets channel ID to match the master it wishes to find,  0 = wildecard
"When the device number is fully known the pairing bit is ignored" (spec. p. 65)
*/
    Host.prototype.setChannelId = function (channel, deviceNum, deviceType, transmissionType, callback) {

        var configurationMsg;

        verifyRange.bind(this)('channel',channel);

        configurationMsg = new SetChannelIDMessage(channel, deviceNum,deviceType,transmissionType);

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);

    };

// Uses the lower 2 bytes of the device serial number as channel Id.
    Host.prototype.setSerialNumChannelId = function (channel, deviceType, transmissionType, callback) {

       

        if (typeof this.capabilities === "undefined")
            callback(new Error('getCapabilities should be run to determine capability for device serial number'));

        if (!this.capabilities.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED) 
            callback(new Error('Device does not support serial number - cannot use lower 2 bytes of serial number as device number in the channel ID'));

            var configurationMsg;

            verifyRange.bind(this)('channel', channel);

            configurationMsg = new SetSerialNumChannelIdMessage(channel, deviceType, transmissionType);

            sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);

    };


    Host.prototype.setChannelPeriod = function (channel,messagePeriod,callback) {

        //if (channel.isBackgroundSearchChannel())
        //    msg = "(Background search channel)";

        var configurationMsg;

        verifyRange.bind(this)('channel',channel);

        configurationMsg = new SetChannelPeriodMessage(channel, messagePeriod);

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);

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

            verifyRange.bind(this)('channel', channel);

            configurationMsg = new SetLowPriorityChannelSearchTimeoutMessage(channel, searchTimeout);

            sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);
           
    };

// Set High priority search timeout, each count in searchTimeout = 2.5 s, 255 = infinite, 0 = disable high priority search mode (default search timeout is 25 seconds)
    Host.prototype.setChannelSearchTimeout = function (channel, searchTimeout,callback) {

        var configurationMsg;

        verifyRange.bind(this)('channel',channel);

        configurationMsg = new SetChannelSearchTimeoutMessage(channel, searchTimeout);

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);


    };

// Set the RF frequency, i.e 66 = 2466 MHz
    Host.prototype.setChannelRFFreq = function (channel, RFFreq, callback) {

        var configurationMsg;

        verifyRange.bind(this)('channel',channel);

        configurationMsg = new SetChannelRFFreqMessage(channel, RFFreq);

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);
    
    };

// Set network key for specific net
    Host.prototype.setNetworkKey = function (netNumber, key, callback) {
      
        var configurationMsg;

        verifyRange.bind(this)('network',netNumber);

        configurationMsg = new SetNetworkKeyMessage(netNumber, key);

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);
    };

    // Set transmit power for all channels
    Host.prototype.setTransmitPower = function (transmitPower, callback) {

        var configurationMsg;

        verifyRange.bind(this)('transmitPower', transmitPower,0,4);

        configurationMsg = new SetTransmitPowerMessage(transmitPower);

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);
    };

    // Set transmit power for individual channel
    Host.prototype.setChannelTxPower = function (channel,transmitPower, callback) {

        if (typeof this.capabilities === "undefined")
            callback(new Error('getCapabilities should be run first to determine if device has capability for setting individual Tx power for a channel'));

        if (!this.capabilities.advancedOptions.CAPABILITIES_PER_CHANNEL_TX_POWER_ENABLED)
            callback(new Error('Device does not support setting individual Tx power for a channel'));

            var configurationMsg;

            verifyRange.bind(this)('channel', channel);
            verifyRange.bind(this)('transmitPower', transmitPower, 0, 4);

            configurationMsg = new SetChannelTxPowerMessage(channel, transmitPower);

            sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);
        
    };

    // "Enabled a one-time proximity requirement for searching. Once a proximity searh has been successful, this threshold value will be cleared" (spec. p. 76)
    Host.prototype.setProximitySearch = function (channel, searchThreshold, callback) {

        if (typeof this.capabilities === "undefined")
            callback(new Error('getCapabilities should be run first to determine if device has capability for proximity search'));

        if (!this.capabilities.advancedOptions2.CAPABILITIES_PROXY_SEARCH_ENABLED) 
            callback(new Error('Device does not support proximity search'));

            var configurationMsg;

            verifyRange.bind(this)('channel', channel);
            verifyRange.bind(this)('searchThreshold', searchThreshold, 0, 10);

            configurationMsg = new SetProximitySearchMessage(channel, searchThreshold);

            sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);
           
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

        verifyRange.bind(this)('channel', channel);

        configurationMsg = new OpenChannelMessage(channel);

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, callback);
    };

    // Close a channel that has been previously opened. Channel still remains assigned and can be reopened at any time. (spec. p 88)
    Host.prototype.closeChannel = function (channel, callback) {
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

        //        function retryResponseNoError() {
        //            self.read(500, errorCallback,
        //                         function success(data) {
        //                             if (!self.isResponseNoError(data, ANTMessage.prototype.MESSAGE.close_channel.id)) {
        //                                 self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Expected response NO ERROR for close channel");
        //                                 retryNr++;
        //                                 if (retryNr < Host.prototype.ANT_RETRY_ON_CLOSE) {
        //                                     self.emit(Host.prototype.EVENT.LOG_MESSAGE, " Discarding "+data.inspect()+" from ANT engine packet queue. Retrying to get NO ERROR response from ANT device");
        //                                     retryResponseNoError();
        //                                 }
        //                                 else {
        //                                     self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Reached maximum number of retries. Aborting.");
        //                                     errorCallback();
        //                                 }
        //                             }
        //                             else 
        //                                 //self.parse_response(data);

        //                                 // Wait for EVENT_CHANNEL_CLOSED
        //                                 // If channel status is tracking -> can get broadcast data packet before channel close packet

        //                                 retryEventChannelClosed();

        //                         });
        //        }

        //        if (typeof noVerifyResponseNoError === "undefined")
        //            retryResponseNoError();
        //        else
        //            successCallback();
        //    });


        //Rx:  <Buffer a4 03 40 01 01 05 e2> Channel Response/Event EVENT on channel 1 EVENT_TRANSFER_TX_COMPLETED
        //Rx:  <Buffer a4 03 40 01 01 06 e1> Channel Response/Event EVENT on channel 1 EVENT_TRANSFER_TX_FAILED

        // Check for specific event code
        //Host.prototype.isEvent = function (code, data) {
        //    var msgId = data[2], channelNr = data[3], eventOrResponse = data[4], eventCode = data[5], EVENT = 1;

        //    return (msgId === ANTMessage.prototype.MESSAGE.channel_response.id && eventOrResponse === EVENT && code === eventCode);
        //};

        // Check if channel response is a no error for a specific requested message id
        //Host.prototype.isResponseNoError = function (data, requestedMsgId) {
        //    var msgId = data[2], msgRequested = data[4], msgCode = data[5];

        //    //console.log(Date.now() + " Validation");
        //    //console.log(data, requestedMsgId);

        //    return (msgId === ANTMessage.prototype.MESSAGE.channel_response.id && msgCode === Host.prototype.RESPONSE_EVENT_CODES.RESPONSE_NO_ERROR && msgRequested === requestedMsgId);

        //};



        var configurationMsg;

        verifyRange.bind(this)('channel', channel);

        configurationMsg = new CloseChannelMessage(channel);

        // To DO: register event handler for EVENT_CHANNEL_CLOSED before calling callback !!!

        // this._
        // TO DO : create a single function for configuration/control commands that receive RESPONSE_NO_ERROR ?

        sendMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, function (error, responseMessage) {
            if (error)
                callback('Failed to close channel nr. ' + channel);
            else
                callback(undefined, responseMessage);
        }.bind(this), function _validationCB(responseMessage) {
            return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        });

    };

    // p. 96 ANT Message protocol and usave rev. 5.0
    // TRANSFER_TX_COMPLETED channel event if successfull, or TX_TRANSFER_FAILED -> msg. failed to reach master or response from master failed to reach the slave -> slave may retry
    // 3rd option : GO_TO_SEARCH is received if channel is dropped -> channel should be unassigned
    Host.prototype.sendAcknowledgedData = function (ucChannel, pucBroadcastData, errorCallback, successCallback) {
        var buf = Buffer.concat([new Buffer([ucChannel]), pucBroadcastData.buffer]),
            self = this,
            message = new ANTMessage(),
            ack_msg = message.create_message(ANTMessage.prototype.MESSAGE.acknowledged_data, buf),
            resendMsg;

        // Add to retry queue -> will only be of length === 1
        resendMsg = {
            message: ack_msg,
            retry: 0,
            EVENT_TRANSFER_TX_COMPLETED_CB: successCallback,
            EVENT_TRANSFER_TX_FAILED_CB: errorCallback,

            timestamp: Date.now(),

            retryCB : function _resendAckowledgedDataCB() {

                if (resendMsg.timeoutID)  // If we already have a timeout running, reset
                    clearTimeout(resendMsg.timeoutID);

                resendMsg.timeoutID = setTimeout(resendMsg.retryCB, 2000);
                resendMsg.retry++;

                if (resendMsg.retry <= Host.prototype.TX_DEFAULT_RETRY) {
                    resendMsg.lastRetryTimestamp = Date.now();
                    // Two-levels of transfer : 1. from app. to ANT via libusb and 2. over RF 
                    self.sendOnly(ack_msg, Host.prototype.ANT_DEFAULT_RETRY, Host.prototype.ANT_DEVICE_TIMEOUT,
                        function error(err) {
                            self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Failed to send acknowledged data packet to ANT engine, due to problems with libusb <-> device"+ err);
                            if (typeof errorCallback === "function")
                                errorCallback(err);
                            else
                                self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No transfer failed callback specified");
                        },
                        function success() { self.emit(Host.prototype.EVENT.LOG_MESSAGE, " Sent acknowledged message to ANT engine "+ ack_msg.friendly+" "+ pucBroadcastData.friendly); });
                } else {
                    self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Reached maxium number of retries of "+ resendMsg.message.friendly);
                    if (typeof resendMsg.EVENT_TRANSFER_TX_FAILED_CB === "function")
                        resendMsg.EVENT_TRANSFER_TX_FAILED_CB();
                    else
                        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No EVENT_TRANSFER_TX_FAILED callback specified");
                }
            }
        };

        this.retryQueue[ucChannel].push(resendMsg);


        //console.log(Date.now() + " SETTING TIMEOUT ");

        //resendMsg.timeoutCB = function () {
        //    //console.log(Date.now() + "TIMEOUT HANDLER FOR EVENT_TRANSFER_TX_COMPLETED/FAILED - NOT IMPLEMENTED");
        //    resendMsg.timeoutRetry++;
        //    if (resendMsg.timeoutRetry <= Host.prototype.TX_DEFAULT_RETRY)
        //        send();
        //    else
        //        console.log(Date.now() + " Reached maxium number of timeout retries");
        //};

        resendMsg.retryCB();

    };

    // Send an individual packet as part of a bulk transfer
    Host.prototype.sendBurstTransferPacket = function (ucChannelSeq, packet, errorCallback, successCallback) {

        var buf,
            burst_msg,
            self = this,
            message = new ANTMessage();

        buf = Buffer.concat([new Buffer([ucChannelSeq]), packet]);

        burst_msg = message.create_message(ANTMessage.prototype.MESSAGE.burst_transfer_data, buf);

        // Thought : what about transfer rate here? Maybe add timeout if there is a problem will burst buffer overload for the ANT engine
        // We will get a EVENT_TRANFER_TX_START when the actual transfer over RF starts
        // p. 102 ANT Message Protocol and Usage rev 5.0 - "it is possible to 'prime' the ANT buffers with 2 (or 8, depending on ANT device) burst packet prior to the next channel period."
        // "its important that the Host/ANT interface can sustain the maximum 20kbps rate"

        self.sendOnly(burst_msg, Host.prototype.ANT_DEFAULT_RETRY, Host.prototype.ANT_DEVICE_TIMEOUT, errorCallback, successCallback);
    };

    // p. 98 in spec.
    // Sends bulk data
    Host.prototype.sendBurstTransfer = function (ucChannel, pucData, errorCallback, successCallback, messageFriendlyName) {
        var numberOfPackets = Math.ceil(pucData.length / 8),
            packetNr,
            lastPacket = numberOfPackets - 1,
            sequenceNr,
            channelNrField,
            packet,
            self = this,
            burstMsg;

        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Burst transfer of "+numberOfPackets+" packets (8-byte) on channel "+ucChannel+", length of payload is "+pucData.length+" bytes");

        // Add to retry queue -> will only be of length === 1
        burstMsg = {
            timestamp: Date.now(),

            message: {
                buffer: pucData,
                friendlyName: messageFriendlyName
            },

            retry: 0,

            EVENT_TRANSFER_TX_COMPLETED_CB: successCallback,
            EVENT_TRANSFER_TX_FAILED_CB: errorCallback,
        

        };

        //console.log(Date.now(), burstMsg);

        this.burstQueue[ucChannel].push(burstMsg);

        var error = function (err) {
            self.emit(Host.prototype.EVENT.LOG_MESSAGE, " Failed to send burst transfer to ANT engine"+ err);
        };

        var success = function () {
            //console.log(Date.now()+ " Sent burst packet to ANT engine for transmission");
        };

        function sendBurst() {

            if (burstMsg.retry <= Host.prototype.TX_DEFAULT_RETRY) {
                burstMsg.retry++;
                burstMsg.lastRetryTimestamp = Date.now();

                for (packetNr = 0; packetNr < numberOfPackets; packetNr++) {

                    sequenceNr = packetNr % 4; // 3-upper bits Rolling from 0-3; 000 001 010 011 000 ....

                    if (packetNr === lastPacket)
                        sequenceNr = sequenceNr | 0x04;  // Set most significant bit high for last packet, i.e sequenceNr 000 -> 100

                    channelNrField = (sequenceNr << 5) | ucChannel; // Add lower 5 bit (channel nr)

                    // http://nodejs.org/api/buffer.html#buffer_class_method_buffer_concat_list_totallength
                    if (packetNr === lastPacket)
                        packet = pucData.slice(packetNr * 8, pucData.length);
                    else
                        packet = pucData.slice(packetNr * 8, packetNr * 8 + 8);

                    self.sendBurstTransferPacket(channelNrField, packet,error,success);
                }
            } else {
                self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Reached maximum number of retries of entire burst of "+ burstMsg.message.friendlyName);
                if (typeof burstMsg.EVENT_TRANSFER_TX_FAILED_CB === "function")
                    burstMsg.EVENT_TRANSFER_TX_FAILED_CB();
                else
                    self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No EVENT_TRANSFER_TX_FAILED callback specified");
            }
        }

        burstMsg.retryCB = function retry() { sendBurst(); };

        sendBurst();
    };

    if (runFromCommandLine) {
       
        var noopIntervalID = setInterval(function _noop() { }, 1000 * 60 * 60 * 24);
        var testCounter = 0;
        var host = new Host();
        host.init({
            vid: 4047,
            pid: 4104,
            libconfig: "channelid,rssi,rxtimestamp",
            //configuration : {
            //    slaveANTPLUS_ANY: {
            //        networkKey: ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"],
            //        channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            //        channelId: new ChannelId(ChannelId.prototype.ANY_DEVICE_NUMBER, ChannelId.prototype.ANY_DEVICE_TYPE, ChannelId.prototype.ANY_TRANSMISSION_TYPE),
            //        RFfrequency: 57,     // 2457 Mhz ANT +
            //        LPsearchTimeout: 24, // 60 seconds
            //        HPsearchTimeout: 10, // 25 seconds n*2.5 s
            //        transmitPower: 3,
            //        channelPeriod: 8070, // HRM
            //    }
            //},
            //establish : [{
            //    channel : 0,
            //    network: 0,
            //    configuration: "slaveANTPLUS_ANY"
            //    }]
               
                    
        }, function (error) {

            if (error) {
                host.emit(Host.prototype.EVENT.ERROR, error)
                host.usb.on('closed', function () {
                    clearInterval(noopIntervalID);
                });
            } else {
                //console.log("Host callback");
                //console.trace();
            }
           
        });
    }

    module.exports = Host;