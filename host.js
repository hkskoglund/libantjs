"use strict";

var events = require('events'),
    util = require('util'),
    USBDevice = require('./USBNode.js'), // Change to appropiate device
    Channel = require('./channel.js'),
    ANTMessage = require('./messages/ANTMessage.js'),

    Duplex = require('stream').Duplex,

    // Control ANT
    ResetSystemMessage = require('./messages/ResetSystemMessage.js'),

     NotificationStartup = require('./messages/NotificationStartup.js'),

    // Request -response

    RequestMessage = require('./messages/RequestMessage.js'),

        CapabilitiesMessage = require('./messages/CapabilitiesMessage.js'),
        ANTVersionMessage = require('./messages/ANTVersionMessage.js'),
        DeviceSerialNumberMessage = require('./messages/DeviceSerialNumberMessage.js'),

    // Configuration

    AssignChannelMessage = require('./messages/AssignChannelMessage.js'),
    UnAssignChannelMessage = require('./messages/UnAssignChannelMessage.js'),
    SetChannelIDMessage = require('./messages/SetChannelIDMessage.js'),
    SetChannelPeriodMessage = require('./messages/SetChannelPeriodMessage.js'),
    SetChannelSearchTimeoutMessage = require('./messages/SetChannelSearchTimeoutMessage.js'),
    SetChannelRFFreqMessage = require('./messages/SetChannelRFFreqMessage.js'),
    SetNetworkKeyMessage = require('./messages/SetNetworkKeyMessage.js'),
    SetTransmitPowerMessage = require('./messages/SetTransmitPowerMessage.js'),

    ChannelResponseMessage = require('./messages/ChannelResponseMessage.js'),

    FrameTransform = require('./messages/FrameTransform.js'), // Add SYNC LENGTH and CRC
    DeFrameTransform = require('./messages/DeFrameTransform.js'),
        
    // Parsing of ANT messages received
    ResponseParser = require('./ANTResponseParser.js');
        
function Host() {
    events.EventEmitter.call(this);
    this._responseParser = new ResponseParser();

    this.retryQueue = {}; // Queue of packets that are sent as acknowledged using the stop-and wait ARQ-paradigm, initialized when parsing capabilities (number of ANT channels of device) -> a retry queue for each channel
    this.burstQueue = {}; // Queue outgoing burst packets and optionally adds a parser to the burst response

    this._mutex = {};
    
}

// Let ANT inherit from EventEmitter http://nodejs.org/api/util.html#util_util_inherits_constructor_superconstructor
util.inherits(Host, events.EventEmitter);

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

};



//Host.prototype.CHANNEL_STATUS = {
//    0x00: "Un-Assigned",
//    0x01: "Assigned",
//    0x02: "Searching",
//    0x03: "Tracking",
//    UN_ASSIGNED: 0x00,
//    ASSIGNED: 0x01,
//    SEARCHING: 0x02,
//    TRACKING: 0x03
//};

Host.prototype.RSSI =
    {
        MEASUREMENT_TYPE: {
            DBM: 0x20
        }
    };

// Log message to console
Host.prototype.showLogMessage = function (msg) {
    console.log(Date.now(), msg);
};

// Initializes TX/RX streams
function initStream() {
    // https://github.com/joyent/node/blob/master/lib/_stream_duplex.js
    this._TXstream = new Duplex({objectMode : true}); // Default highWaterMark = 16384 bytes
    this._RXstream = new Duplex();

    //this._RXstream = new Writable();

    // Must be defined/overridden otherwise throws error "not implemented"
    // _read-function is used to generate data when the consumer wants to read them
    // https://github.com/substack/stream-handbook#creating-a-readable-stream
    // https://github.com/joyent/node/blob/master/lib/_stream_readable.js
    this._TXstream._read = function (size) {
        //console.trace();
        //console.log("Host read %d bytes", size);
        //console.log(this._TXstream._readableState.buffer,size); // .buffer is an array of buffers [buf1,buf2,....] based on whats pushed 
        // this.readable.push('A');
    }.bind(this);

    this._RXstream._read = function (size) {
        //console.trace();
        //console.log("_RXstream._read read %d bytes", size);
        //console.log(this._RXstream._readableState.buffer,size); // .buffer is an array of buffers [buf1,buf2,....] based on whats pushed 
    }.bind(this);

    //this._TXstream.pipe(process.stdout);

    // http://nodejs.org/api/stream.html#stream_class_stream_readable
    // "If you just want to get all the data out of the stream as fast as possible, this is the best way to do so."
    // This is socalled "FLOW"-mode (no need to make a manual call to .read to get data from internal buffer)
    // https://github.com/substack/stream-handbook
    //Note that whenever you register a "data" listener, you put the stream into compatability mode so you lose the benefits of the new streams2 api.
    //this._TXstream.addListener('data', function _streamDataListener(response) {
    //    console.log(Date.now(), 'Stream RX:', response);
    //    this.parse_response(response);
    //}.bind(this));

    // 'readable' event signals that data is available in the internal buffer list that can be consumed with .read call

    this._TXstream.addListener('readable', function () {
        var buf;
        // console.log("**************************readable", arguments);
        // console.log("TX:",this._TXstream._readableState.buffer)
        //buf = this._TXstream.read();
        // console.log(Date.now(), 'Stream TX test:', buf);

        //this.parse_response(buf);
        // this._TXstream.unshift(buf);
    }.bind(this));

    this._TXstream.on('error', function (msg, err) {
        this.emit(Host.prototype.EVENT.LOG_MESSAGE, msg);
        if (typeof err !== "undefined")
            this.emit(Host.prototype.EVENT.LOG_MESSAGE, err);
    }.bind(this));

    //this._TXstream.addListener('drain', function () { console.log(Date.now(), "Stream RX DRAIN",arguments); });

    //this._TXstream.addListener('finish', function () {

    //    console.log(Date.now(), "Stream RX FINISH", arguments);

    //}.bind(this));

    //// Callback from doWrite-func. in module _stream_writable (internal node.js)
    this._RXstream._write = function _write(ANTresponse, encoding, nextCB) {
        // console.trace();
        //console.log("RX:", arguments[0]);
        //console.log(Date.now(), "Host _write (Stream RX:)", ANTresponse);

        //this._responseParser.parse_response(ANTresponse);
        this._RXstream.push(ANTresponse); // Send it on the pipes
        nextCB();
    }.bind(this);

}

// Initializes USB device and set up of TX/RX stream pipes
Host.prototype.init = function (idVendor, idProduct, nextCB) {

    var vendor = idVendor || 4047,
        product = idProduct || 4104;

    process.on('SIGINT', function sigint() {
        //console.log("ANT SIGINT");
        this.exit(function _exitCB() { console.log("USB ANT device closed. Exiting."); nextCB(); });

    }.bind(this));

    this.usb = new USBDevice();

    this.frameTransform = new FrameTransform(); // TX
    this.deframeTransform = new DeFrameTransform(); // RX

    initStream.bind(this)();


    this.addListener(Host.prototype.EVENT.LOG_MESSAGE, this.showLogMessage);
    this.addListener(Host.prototype.EVENT.ERROR, this.showLogMessage);


    this._responseParser.addListener(ResponseParser.prototype.EVENT.NOTIFICATION_SERIAL_ERROR, function (notification) {
        //nextCB(new Error(notification.toString()));
        this.emit(Host.prototype.EVENT.LOG_MESSAGE, notification.toString());
    }.bind(this));


    
    //this.addListener(Host.prototype.EVENT.SET_CHANNEL_ID, this.parseChannelID);
   

    this.usb.init(vendor, product, function _usbInitCB(error) {

        // Normally get a timeout after draining 
        if (this.usb.isTimeoutError(error)) {

            // TX: Wire outgoing pipes host -> frame transform -> usb
            this._TXstream.pipe(this.frameTransform.getStream()).pipe(this.usb.getStream());

            // RX: Wire incoming pipes usb -> deframe transf. -> host
            this.usb.getStream().pipe(this.deframeTransform.getStream()).pipe(this._RXstream).pipe(this._responseParser);

            this.usb.listen(function _USBListenCB(error) {
                nextCB(error);
            });


            this.resetSystem(function (error, notification) {
                if (!error) {
                    this.emit(Host.prototype.EVENT.LOG_MESSAGE, notification.toString());
                    this.startupNotification = notification;
                    this.getCapabilities(function (error, capabilities) {
                        if (!error) {
                            this.capabilities = capabilities;
                            //console.log(capabilities);
                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, capabilities.toString());
                            // TO DO : setup max. channel configurations
                            this.getANTVersion(function (error, version) {
                                if (!error) {
                                    this.emit(Host.prototype.EVENT.LOG_MESSAGE, version.toString());

                                    if (this.capabilities.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED) {

                                        this.getDeviceSerialNumber(function (error, serialNumberMsg) {
                                            if (!error) {
                                                this.deviceSerialNumber = serialNumberMsg.serialNumber;
                                                this.emit(Host.prototype.EVENT.LOG_MESSAGE, serialNumberMsg.toString());
  
                                                
                                                this.assignChannel(0,0x00,0,undefined, function (error, response) {
                                                    if (!error) {
                                                        this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());

                                                            this.setChannelId(0,0,248,1, function (error, response) {
                                                                if (!error) {
                                                                    this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());

                                                                    this.setChannelPeriod(0, 8192, function (error, response) {
                                                                        if (!error) {
                                                                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());

                                                                            this.setChannelSearchTimeout(0, 24, function (error, response) {
                                                                                if (!error) {
                                                                                    this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());

                                                                                    this.setChannelRFFreq(0, 57, function (error, response) {
                                                                                        if (!error) {
                                                                                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());

                                                                                            this.setTransmitPower(2, function (error, response) {
                                                                                                if (!error) {
                                                                                                    this.emit(Host.prototype.EVENT.LOG_MESSAGE, response.toString());
                                                                                                }
                                                                                                else
                                                                                                    this.emit(Host.prototype.EVENT.LOG_MESSAGE, error);
                                                                                            }.bind(this));
                                                                                        }
                                                                                        else
                                                                                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, error);
                                                                                    }.bind(this));
                                                                                }
                                                                                else
                                                                                    this.emit(Host.prototype.EVENT.LOG_MESSAGE, error);
                                                                            }.bind(this));
                                                                        }
                                                                        else
                                                                            this.emit(Host.prototype.EVENT.LOG_MESSAGE, error);
                                                                    }.bind(this));
                                                                }
                                                                else
                                                                    this.emit(Host.prototype.EVENT.LOG_MESSAGE, error);
                                                            }.bind(this));
                                                    }
                                                    else
                                                        this.emit(Host.prototype.EVENT.LOG_MESSAGE, error);
                                                }.bind(this));
                                            } else
                                                nextCB(error)
                                        }.bind(this));
                                    }
                                }
                                else
                                    nextCB(error);
                            }.bind(this));

                        } else
                            nextCB(error);
                    }.bind(this));
                } else
                    nextCB(error);
            }.bind(this));
        }

    }.bind(this));

};

// Exit USB device and closes/end TX/RX stream
Host.prototype.exit = function (callback) {
    // console.log("Inside exit ANT");

    // Finish RX stream
    this._RXstream.end(null)
    // TEST : [Error: write after end]
    //this._RXstream.write(new Buffer(10));

    // Close TX stream
    this._TXstream.push(null);
    // TEST EOF readable stream : this._TXstream.push(new Buffer(10)); 
    //-> gives [Error: stream.push() after EOF]

    // Exit USB

    this.usb.exit(callback);


};

// Send a reset device command
Host.prototype.resetSystem = function (callback) {

    var RESET_DELAY_TIMEOUT = 500; // Allow 500 ms after reset command before continuing with callbacks...
    var msg = new ResetSystemMessage();

    scheduleRetryMessage.bind(this)(msg, ResponseParser.prototype.EVENT.NOTIFICATION_STARTUP, function (error, message) {
        setTimeout(callback.bind(this), RESET_DELAY_TIMEOUT, error, message);
    }.bind(this));
};

// Send a request for ANT version
Host.prototype.getANTVersion = function (callback) {

    var msg = (new RequestMessage(0, ANTMessage.prototype.MESSAGE.ANT_VERSION));

    scheduleRetryMessage.bind(this)(msg, ResponseParser.prototype.EVENT.ANT_VERSION, function (error,message) {
        if (error)
            callback('Failed to get version of ANT device')
        else
            callback(undefined,message);
    }.bind(this));
       
};

// Send a request for device capabilities
Host.prototype.getCapabilities = function (callback) {

    var msg = (new RequestMessage(0, ANTMessage.prototype.MESSAGE.CAPABILITIES));

    scheduleRetryMessage.bind(this)(msg, ResponseParser.prototype.EVENT.CAPABILITIES, function (error,message) {
        if (error)
            callback('Failed to get capabilities of ANT device')
        else
            callback(undefined,message);
    }.bind(this));
        
};

// Send a request for device serial number
Host.prototype.getDeviceSerialNumber = function (callback) {

    var msg = (new RequestMessage(0, ANTMessage.prototype.MESSAGE.DEVICE_SERIAL_NUMBER))


    scheduleRetryMessage.bind(this)(msg, ResponseParser.prototype.EVENT.DEVICE_SERIAL_NUMBER,
        function (error,message) {
            if (error)
                callback('Failed to get ANT device serial number')
            else
                callback(undefined,message);
        }.bind(this));
};

// Determine valid channel/network
function verifyRange(type,value,low,high) {

    if (typeof value === "undefined")
        throw new TypeError('Number specified is undefined')
    
    switch (type) {
        case 'channel':

            if (this.capabilities && (value > (this.capabilities.MAX_CHAN - 1) || value < 0))
                throw new TypeError('Channel nr ' + value + ' out of bounds');

            break;

        case 'network':
            if (this.capabilities && (value > (this.capabilities.MAX_NET - 1) || value < 0))
                throw new TypeError('Network nr ' + value + ' out of bounds');

            break;

        case 'transmitPower':

            if (value > high || value < low)
                throw new TypeError('Transmit power out of bounds');

            break;

        default: throw new Error('Unknown type, cannot verify range');

    }
}

// Send request for channel status, determine state (un-assigned, assigned, searching or tracking)
Host.prototype.getChannelStatus = function (channelNr, callback) {

    verifyRange.bind(this)('channel',channelNr);

    var msg = (new RequestMessage(channelNr, ANTMessage.prototype.MESSAGE.CHANNEL_STATUS))

    scheduleRetryMessage.bind(this)(msg,ResponseParser.prototype.EVENT.CHANNEL_STATUS,
        function (error, message) {
            if (error)
                callback('Failed to get channel status for channel '+channelNr)
            else
                callback(undefined, message);
        }.bind(this));
};

// Send a message, if a reply is not received, it will retry for 500ms. Optionally runs a validator func. that returns true if the response is valid
function scheduleRetryMessage(sendMessage,event,callback,validator) {
    //console.trace();
    //console.log("ARGS", arguments);
    var timeoutID,
        startTimestamp,
        currentTimestamp,
        MAX_TIMESTAMP_DIFF = 500, // Wait 500 ms before creating error for failed response from ANT
        listenerCalled = false,
        // Listener for responses
    listener = function (responseMessage) {
           listenerCalled = true;
            var processCB = function _processCB() {
                //console.log(responseMessage.name);
                this._responseParser.removeListener(event, listener);
               
                clearTimeout(timeoutID);
               
                callback(undefined, responseMessage);
            }.bind(this);

            if (!validator)
                processCB();
            else if (typeof validator === "function" && validator(responseMessage))  // Run validator for response, i.e Reset system control command -> Notification startup response, conf. command Assign -> channel response NO error
                processCB();
            else 
                this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Failed validation: ' + responseMessage.toString());
            
                
        }.bind(this);
    
    //console.log(this._responseParser._events);

    this._responseParser.on(event, listener);
    //var removeCB = function (type, listener) {
    //    //console.trace();
    //    console.log('Removed ' + type);
    //    this._responseParser.removeListener('removeListener', removeCB);
    //}.bind(this);

    //this._responseParser.on('removeListener', removeCB);

    function retry() {

        currentTimestamp = Date.now();

        this._TXstream.push(sendMessage); // TX -> generates a "readable" thats piped into FrameTransform

        if ((currentTimestamp - startTimestamp) <= MAX_TIMESTAMP_DIFF)
            // http://nodejs.org/api/timers.html
            timeoutID = setTimeout(function _retryTimerCB() { setImmediate(retry.bind(this)) }.bind(this), (this.usb.getDirectANTChipCommunicationTimeout() * 2 + 5));
        else if (!listenerCalled) {
            // This is mentioned in the spec., but probably occurs very rarely
            // http://www.thisisant.com/forum/viewthread/4061/
            // Flush ANT receive buffer - send 15 zero's
            this._responseParser.removeListener(event, listener);

            //var zeroMsg = new ANTMessage();
            //zeroMsg.id = 0x00;
            
            var zeroBuffer = new Buffer(15);
            
            for (var i = 0; i < 15; i++)
                zeroBuffer[i] = 0;
            //zeroMsg.setContent(zeroBuffer);

            // zeroMsg length is 24 bytes now
            // NO SYNC gives Notification Serial Error - First byte not SYNC
            // Longer than 24 bytes -> Notification Serial Error - ANT Message too long
            this.usb.write(zeroBuffer, function (error) {
                if (!error)
                    this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Reset ANT receive state machine');
                else
                    this.emit(Host.prototype.EVENT.LOG_MESSAGE, 'Failed : Reset ANT receive state machine');
            }.bind(this));

            callback(new Error('No reply from ANT device'));

        } else if (listenerCalled)
            callback(new Error('Failed to validate reply for message '+sendMessage.name + MAX_TIMESTAMP_DIFF + " ms."));
    }

    startTimestamp = Date.now();
    retry.bind(this)();

}

// From spec. p. 17 - "an 8-bit field used to define certain transmission characteristics of a device" - shared address, global data pages.
// For ANT+/ANTFS :

Host.prototype.parseTransmissionType = function (transmissionType) {
    var msg = "";

    // Bit 0-1
    switch (transmissionType & 0x03) {
        case 0x00: msg += "Reserved"; break;
        case 0x01: msg += "Independed Channel"; break;
        case 0x02: msg += "Shared Channel using 1 byte address (if supported)"; break;
        case 0x03: msg += "Shared Channel using 2 byte address"; break;
        default: msg += "?"; break;
    }

    // Bit 2
    switch ((transmissionType & 0x07) >> 2) {
        case 0: msg += " | Global data pages not used"; break;
        case 1: msg += " | Global data pages used"; break;
        default: msg += " | ?"; break;
    }

    if ((transmissionType & 0xF0) >> 4)
        msg += " | 20-bit device #";

    return msg;
};

Host.prototype.parseChannelID = function (data,relIndex) {


    var channelID =
     {
         channelNumber: data[3]
     },
        self = this, relativeIndex = 0;

    if (typeof relIndex !== "undefined") // Extended messages parsing
        relativeIndex = relIndex;

    if (7 + relativeIndex < data.length) {
        channelID.deviceNumber = data.readUInt16LE(4 + relativeIndex);
        channelID.deviceTypeID = data[6 + relativeIndex];
        channelID.transmissionType = data[7 + relativeIndex];

        channelID.toProperty = "CHANNEL_ID_" + channelID.channelNumber + "_" + channelID.deviceNumber + "_" + channelID.deviceTypeID + "_" + channelID.transmissionType;

        //console.log("parsed channelID ",channelID.toProperty,"relative Index",relativeIndex);

        channelID.toString = function () {
            return "Channel # " + channelID.channelNumber + " device # " + channelID.deviceNumber + " device type " + channelID.deviceTypeID + " transmission type " + channelID.transmissionType + " " + self.parseTransmissionType(channelID.transmissionType);
        };


        this.channelConfiguration[channelID.channelNumber].channelID = channelID;
        this.channelConfiguration[channelID.channelNumber].hasUpdatedChannelID = true;

        //this.emit(Host.prototype.EVENT.LOG_MESSAGE, channelID.toString());

    } else {
        console.log(Date.now(), "Attempt to read beyond data buffer length data length", data.length, "relativeIndex", relativeIndex, data);
    }
   
    //console.log(channelID.toString());
    return channelID;
};

//Host.prototype.parseChannelStatus = function (data) {

//    //console.log("THIS", this);

//    var channelStatus = {
//        channelNumber: data[3],
//        channelType: (data[4] & 0xF0) >> 4,  // Bit 4:7
//        networkNumber: (data[4] & 0x0C) >> 2, // Bit 2:3
//        channelState: data[4] & 0x03, // Bit 0:1

//    };

//    channelStatus.channelStateFriendly = Host.prototype.CHANNEL_STATUS[channelStatus.channelState];

//    channelStatus.toString = function () {
//        return "Channel status " + channelStatus.channelNumber + " type " + Channel.prototype.CHANNEL_TYPE[channelStatus.channelType] + " (" + channelStatus.channelType + " ) network " + channelStatus.networkNumber + " " + channelStatus.channelStateFriendly;
//    };

//    // Update channel configuration
//    if (typeof this.channelConfiguration[channelStatus.channelNumber] === "undefined") {
//        //this.emit(Host.prototype.EVENT.LOG_MESSAGE, "Creating new channel configuration for channel to hold channel status for channel " + channelStatus.channelNumber);
//        this.channelConfiguration[channelStatus.channelNumber] = { number: channelStatus.channelNumber };
//    }

//    this.channelConfiguration[channelStatus.channelNumber].channelStatus = channelStatus;

//    //this.emit(Host.prototype.EVENT.LOG_MESSAGE, channelStatus.toString());

//    return channelStatus;
//};

//Host.prototype.parseChannelResponse = function (data) {
//    var channel = data[3],
//        msgId = data[4],
//        msgCode = data[5],
//            msg;

//    //console.log("CHANNEL RESPONSE RAW", data);
//    if (msgId === 1) // Set to 1 for RF event
//        msg = "EVENT on channel " + channel + " " + Host.prototype.RESPONSE_EVENT_CODES[msgCode].friendly+" ";
//    else
//        msg = "RESPONSE on channel " + channel + " to msg. id 0x" + msgId.toString(16) + "  " + ANTMessage.prototype.MESSAGE[msgId] + " " + Host.prototype.RESPONSE_EVENT_CODES[msgCode].friendly;

    
//    //this.emit(Host.prototype.EVENT.LOG_MESSAGE, msg);

//    return msg;
//};

Host.prototype.parse_extended_RSSI = function (channelNr,data,startIndex) {
    //console.log("CHANNEL NR: ",channelNr,"startIndex",startIndex,"data:",data);
    // http://www.thisisant.com/forum/viewthread/3841 -> not supported on nRF24AP2....
    // Create new RSSI object if not available
    var self = this;
    if (typeof this.channelConfiguration[channelNr].RSSI === "undefined")
        this.channelConfiguration[channelNr].RSSI = {};

    this.channelConfiguration[channelNr].RSSI.measurementType = data[startIndex];

    if (this.channelConfiguration[channelNr].RSSI.measurementType === Host.prototype.RSSI.MEASUREMENT_TYPE.DBM) {
        this.channelConfiguration[channelNr].RSSI.value = data[startIndex + 1];
        this.channelConfiguration[channelNr].RSSI.thresholdConfigurationValue = data[startIndex + 2];
    }
    //else
    //    this.emit(Host.prototype.EVENT.LOG_MESSAGE, " Cannot decode RSSI, unknown measurement type " + this.channelConfiguration[channelNr].RSSI.measurementType);

    //console.log(this.channelConfiguration[channelNr].RSSI);
    this.channelConfiguration[channelNr].RSSI.toString = function () {
        var str;

        str = "Measurement type 0x" + self.channelConfiguration[channelNr].RSSI.measurementType.toString(16);

        if (self.channelConfiguration[channelNr].RSSI.value)
            str += " RSSI value " + self.channelConfiguration[channelNr].RSSI.value;

        if (self.channelConfiguration[channelNr].RSSI.thresholdConfigurationValue)
            str += " Threshold conf. value " + self.channelConfiguration[channelNr].RSSI.thresholdConfigurationValue;

        return str;
    };

    return this.channelConfiguration[channelNr].RSSI;

};

// Parsing of the "flagged extended data message format"
Host.prototype.parse_extended_message = function (channelNr,data) {
    var msgLength = data[1], msgFlag,
        self = this,
        relativeIndex = 9,
        previous_RX_Timestamp;
        

    if (msgLength <= relativeIndex) {
        self.emit(Host.prototype.EVENT.LOG_MESSAGE, " No extended message info. available");
        return;
    }

    //console.log("Extended message flag + {channelID+RSSI+RX_Timestamp} + CRC", data.slice(4+8), "message length:",msgLength);

    msgFlag = data[12];

    // Check for channel ID
    // p.37 spec: relative order of extended messages; channel ID, RSSI, timestamp (based on 32kHz clock, rolls over each 2 seconds)

    if (msgFlag & Host.prototype.LIB_CONFIG.ENABLE_CHANNEL_ID) {
        this.parseChannelID(data, relativeIndex);
        relativeIndex = relativeIndex + 8; // Channel ID = Device Number 2-bytes + Device type 1 byte + Transmission Type 1 byte
    }

    if (msgFlag & Host.prototype.LIB_CONFIG.ENABLE_RSSI) {
        this.parse_extended_RSSI(channelNr,data, relativeIndex);
        relativeIndex = relativeIndex + 4;
    }

    if (msgFlag & Host.prototype.LIB_CONFIG.ENABLE_RX_TIMESTAMP) {
        // console.log(data,relativeIndex);
        if (typeof this.channelConfiguration[channelNr].RX_Timestamp)
            previous_RX_Timestamp = this.channelConfiguration[channelNr].RX_Timestamp;
        // Some times RangeError is generated during SIGINT
        try {
            //if (relativeIndex <= data.length -2) {
                this.channelConfiguration[channelNr].RX_Timestamp = data.readUInt16LE(relativeIndex);
                if (typeof previous_RX_Timestamp !== "undefined") {
                    this.channelConfiguration[channelNr].RX_Timestamp_Difference = this.channelConfiguration[channelNr].RX_Timestamp - previous_RX_Timestamp;
                    if (this.channelConfiguration[channelNr].RX_Timestamp_Difference < 0) // Roll over
                        this.channelConfiguration[channelNr].RX_Timestamp_Difference += 0xFFFF;
                }
           // } else
           //     console.log(Date.now(), "Attempt to UInt16LE read RX_Timestamp buffer data length :", data.length, "at index", relativeIndex,data);
        } catch (err) {
            console.log(Date.now(),"Parsing extended packet info RX_Timestamp Data length : ", data.length, "relativeIndex", relativeIndex,data,err);
            //throw err;
        }

       
        //console.log("Timestamp", this.channelConfiguration[channelNr].RX_Timestamp);
    }
};



// Called on first receive of broadcast from device/master
Host.prototype.getUpdatedChannelID = function (channelNr, errorCallback, successCallback) {
    var msgId, self = this;

    self.sendOnly(self.request(channelNr, ANTMessage.prototype.MESSAGE.set_channel_id.id),
        Host.prototype.ANT_DEFAULT_RETRY, Host.prototype.ANT_DEVICE_TIMEOUT,
        //function validation(data) { msgId = data[2]; return (msgId === ANT_MESSAGE.set_channel_id.id); },
        function error(err) {
            if (typeof errorCallback === "function")
                errorCallback(err);
            else
                self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Found no error callback");
        },
        function success() {
            self.read(Host.prototype.ANT_DEVICE_TIMEOUT, errorCallback,
               function success(data) {
                   var msgId = data[2];
                   if (msgId !== ANTMessage.prototype.MESSAGE.set_channel_id.id)
                       self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Expected set channel id message response");
                   self.parse_response(data);
                   if (typeof successCallback === "function")
                       successCallback(data);
                   else
                       self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Found no success callback");
               });
        });
};


    // Iterates from channelNrSeed and optionally closes channel
    Host.prototype.iterateChannelStatus = function (channelNrSeed, closeChannel, iterationFinishedCB) {
        var self = this;

        self.getChannelStatus(channelNrSeed, function error() {
            self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Could not retrive channel status");
        },
            function success() {

                //if (self.channelConfiguration[channelNrSeed].channelStatus.channelState === Host.prototype.CHANNEL_STATUS.SEARCHING ||
                //    self.channelConfiguration[channelNrSeed].channelStatus.channelState === Host.prototype.CHANNEL_STATUS.TRACKING)
                //    console.log(self.channelConfiguration[channelNrSeed].channelStatus.toString());

                function reIterate() {
                    ++channelNrSeed;
                    if (channelNrSeed < self.capabilities.MAX_CHAN)
                        self.iterateChannelStatus(channelNrSeed, closeChannel, iterationFinishedCB);
                    else {
                        if (typeof iterationFinishedCB === "function")
                            iterationFinishedCB();
                        else
                            self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No iteration on channel status callback specified");
                    }
                }

                if (closeChannel && (self.channelConfiguration[channelNrSeed].channelStatus.channelState === Host.prototype.CHANNEL_STATUS.SEARCHING ||
                       self.channelConfiguration[channelNrSeed].channelStatus.channelState === Host.prototype.CHANNEL_STATUS.TRACKING))
                    self.close(channelNrSeed, function error(err) {
                        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Could not close channel "+ err);
                    },
                        function success() {
                            self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Channel " + channelNrSeed + " CLOSED.");
                            reIterate();
                        });
                else
                    reIterate();
            });

    };

    // Associates a channel with a channel configuration
    Host.prototype.setChannelConfiguration = function (channel) {
        var self = this;
        //console.trace();

        //console.log(Date.now() + "Configuration of channel nr ", channel.number);

        if (typeof self.channelConfiguration === "undefined") {
            self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No channel configuration object available to attach channel to. getCapabilities should be run beforehand to get max. available channels for device");
            return;
        }

        self.channelConfiguration[channel.number] = channel;
        //console.log("CHANNEL CONFIGURATION",self.channelConfiguration);
    },

    // Configures a channel
    Host.prototype.activateChannelConfiguration = function (desiredChannel, errorCallback, successCallback) {
        //console.log("DESIRED CHANNEL", desiredChannel);
        var self = this, channelNr = desiredChannel.number;
        var channel = self.channelConfiguration[channelNr];

        var continueConfiguration = function () {

            self.setChannelSearchTimeout(channelNr,
                   function error(err) { self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Could not channel searchtimeout " + channel); errorCallback(err); },
                    function (data) {
                        //console.log(Date.now() + " Set channel search timeout OK");

                        self.setChannelRFFrequency(channelNr,
                               function error(err) { self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Could not set RF frequency " + channel); errorCallback(err); },
                                function (data) {
                                    // console.log(Date.now() + " Set channel RF frequency OK");
                                    if (typeof channel.searchWaveform !== "undefined") {
                                        self.setSearchWaveform(channelNr,
                                           function error(err) { self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Could not channel search waveform " + channel); errorCallback(err); },
                                           function (data) {
                                               // console.log(Date.now() + " Set channel search waveform OK");
                                               successCallback();
                                           });
                                    } else
                                        successCallback();
                                });
                    });
        };

        //console.log("Configuring : ", channelNr);

    
        self.setNetworkKey(channelNr,
                                   function error(err) { self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Failed to set network key." + channel.network); errorCallback(err); },
                                   function (data) {
                                       // console.log("Set network key OK ");
                                       self.assignChannel(channelNr,
                                           function error(err) { self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Could not assign channel "+channel); errorCallback(err); },
                                           function (data) {
                       
                                               //console.log(Date.now() + " Assign channel OK");
                                               self.setChannelId(channelNr,
                                                   function error(err) { self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Could not set channel id "+ channel); errorCallback(err); },
                                                    function (data) {
                                                        //console.log(Date.now() + " Set channel id OK ");
                                                        self.setChannelPeriod(channelNr,
                                                           function error(err) { self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Could not set period "+ channel); errorCallback(err); },
                                                            function (data) {
                                                                //console.log(Date.now() + " Set channel period OK ");
                                                                if (typeof channel.lowPrioritySearchTimeout !== "undefined")
                                                                    self.setLowPriorityChannelSearchTimeout(channelNr,
                                                                        function error(err) { self.emit(Host.prototype.EVENT.LOG_MESSAGE, " Could not set low priority search timeout" + channel); errorCallback(err); },
                                                                        function success() {
                                                                            continueConfiguration();
                                                                        });
                                                                else
                                                                    continueConfiguration();
                                                      
                                                            });
                                                    });
                                           });
                                   });

    };

    Host.prototype.LIB_CONFIG = {
        DISABLED: 0x00,
        ENABLE_RX_TIMESTAMP: 0x20, // Bit 6
        ENABLE_RSSI: 0x40, // Bit 7 
        ENABLE_CHANNEL_ID: 0x80 // Bit 8
    };

    // Spec p. 75 "If supported, when this setting is enabled ANT will include the channel ID, RSSI, or timestamp data with the messages"
    // 0 - Disabled, 0x20 = Enable RX timestamp output, 0x40 - Enable RSSI output, 0x80 - Enabled Channel ID output
    Host.prototype.libConfig = function (ucLibConfig, errorCallback, successCallback) {
        var self = this,
            filler = 0,
            libConfigMsg = new ANTMessage();

        //console.log("libConfig hex = ", Number(ucLibConfig).toString(16),"binary=",Number(ucLibConfig).toString(2));
        if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
            this.sendAndVerifyResponseNoError(libConfigMsg.create_message(ANTMessage.prototype.MESSAGE.libConfig, new Buffer([filler, ucLibConfig])), ANTMessage.prototype.MESSAGE.libConfig.id, errorCallback, successCallback);
        else if (typeof this.capabilities !== "undefined" && !this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
            self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Device does not support extended messages - tried to configure via LibConfig API call");
    };

    // Only enables Channel ID extension of messages
    Host.prototype.RxExtMesgsEnable = function (ucEnable, errorCallback, successCallback) {
        var self = this, filler = 0, message = new ANTMessage();

        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Instead of using this API call libConfig can be used");

        if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
            this.sendAndVerifyResponseNoError(message.create_message(ANTMessage.prototype.MESSAGE.RxExtMesgsEnable, new Buffer([filler, ucEnable])), ANTMessage.prototype.MESSAGE.RxExtMesgsEnable.id, errorCallback, successCallback);
        else if (typeof this.capabilities !== "undefined" && !this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
            self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Device does not support extended messages - tried to configure via RxExtMesgsEnable API call");
    };

    // Spec. p. 77 "This functionality is primarily for determining precedence with multiple search channels that cannot co-exists (Search channels with different networks or RF frequency settings)"
    // This is the case for ANT-FS and ANT+ device profile like i.e HRM
    Host.prototype.setChannelSearchPriority = function (ucChannelNum, ucSearchPriority, errorCallback, successCallback) {
        var self = this, message = new ANTMessage();

        this.sendAndVerifyResponseNoError(message.create_message(ANTMessage.prototype.MESSAGE.set_channel_search_priority, new Buffer([ucChannelNum, ucSearchPriority])), ANTMessage.prototype.MESSAGE.set_channel_search_priority.id, errorCallback, successCallback);

    };


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

        verifyRange.bind(this)('channel',channelNr);

        configurationMsg = new UnAssignChannelMessage();

        scheduleRetryMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, function (error, responseMessage) {
            if (error)
                callback('Failed to un-assign channel nr. ' + channelNr)
            else
                callback(undefined, responseMessage);
        }.bind(this), function _validationCB(responseMessage) {
            return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        });
    }

/* Reserves channel number and assigns channel type and network number to the channel, sets all other configuration parameters to defaults.
 Assign channel command should be issued before any other channel configuration messages (p. 64 ANT Message Protocol And Usaga Rev 50) ->
 also sets defaults values for RF, period, tx power, search timeout p.22 */
    Host.prototype.assignChannel = function (channelNr, channelType, networkNumber, extend, callback) {
        var cb, configurationMsg;

        verifyRange.bind(this)('channel',channelNr);

        configurationMsg = new AssignChannelMessage(channelNr, channelType, networkNumber, extend);

        
        if (typeof extend === "function")
            cb = extend; // If no extended assignment use parameter as callback
        else
            cb = callback;

        scheduleRetryMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, function (error, responseMessage) {
            if (error)
                cb('Failed to assign channel nr. ' + channelNr)
            else
                cb(undefined, responseMessage);
        }.bind(this), function _validationCB(responseMessage) {
            return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        });
        
    };


/* Master: id transmitted along with messages Slave: sets channel ID to match the master it wishes to find,  0 = wildecard
"When the device number is fully known the pairing bit is ignored" (spec. p. 65)
*/
    Host.prototype.setChannelId = function (channel, deviceNum, deviceType, transmissionType, callback) {

        ////(false, 0, 0, 0, 0),  // Search, no pairing   
        ////                        DEFAULT_RETRY, ANT_DEVICE_TIMEOUT,
        ////                        function () { exit("Failed to set channel id.") },
        //// ANTWARE II - log file   1061.985 { 798221031} Tx - [A4][05][51][00][00][00][78][00][88][00][00]

        //var set_channel_id_msg, self = this, message = new ANTMessage();
        //var channel = this.channelConfiguration[channelNr];
        ////console.log("Setting channel id. - channel number " + channel.number + " device type " + channel.deviceType + " transmission type " + channel.transmissionType);

        //var buf = new Buffer(5);
        //buf[0] = channel.number;
        //buf.writeUInt16LE(channel.channelID.deviceNumber, 1); // If slave 0 matches any device number / dev id.
        //// Seems like its not used at least for slave?  buf[3] = channel.deviceType & 0x80; // If bit 7 = 1 -> master = request pairing, slave = find pairing transmitter -> (pairing bit)
        //// Pairing bit-set in Channel object, if pairing requested deviceType = deviceType | 0x80;
        //buf[3] = channel.channelID.deviceType;
        //buf[4] = channel.channelID.transmissionType; // Can be set to zero (wildcard) on a slave device, spec. p. 18 ANT Message Protocol and Usage, rev 5.0

        //set_channel_id_msg = message.create_message(ANTMessage.prototype.MESSAGE.set_channel_id, buf);

        //this.sendAndVerifyResponseNoError(set_channel_id_msg, ANTMessage.prototype.MESSAGE.set_channel_id.id, errorCallback, successCallback);

        var configurationMsg;

        verifyRange.bind(this)('channel',channel);

        configurationMsg = new SetChannelIDMessage(channel, deviceNum,deviceType,transmissionType);

        scheduleRetryMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, function (error, responseMessage) {
            if (error)
                callback('Failed to set channel id for channel nr. ' + channel)
            else
                callback(undefined, responseMessage);
        }.bind(this), function _validationCB(responseMessage) {
            return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        });

    };

    Host.prototype.setChannelPeriod = function (channel,messagePeriod,callback) {

        //var set_channel_period_msg, rate, self = this, message = new ANTMessage();
        //var channel = this.channelConfiguration[channelNr];
   
        //var msg = "";

        //if (channel.isBackgroundSearchChannel())
        //    msg = "(Background search channel)";

        ////console.log("Set channel period for channel " + channel.number + " to " + channel.periodFriendly + " value: " + channel.period);

        //if (typeof channel.period !== "undefined") {
        //    var buf = new Buffer(3);
        //    buf[0] = channel.number;
        //    buf.writeUInt16LE(channel.period, 1);

        //    set_channel_period_msg = message.create_message(ANTMessage.prototype.MESSAGE.set_channel_messaging_period, new Buffer(buf));

        //    this.sendAndVerifyResponseNoError(set_channel_period_msg, ANTMessage.prototype.MESSAGE.set_channel_messaging_period.id, errorCallback, successCallback);
        //} else {
        
        //    self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Channel period not specified for channel "+channel.number+" "+msg);
        //    successCallback(); // Continue with configuration

        //}

        var configurationMsg;

        verifyRange.bind(this)('channel',channel);

        configurationMsg = new SetChannelPeriodMessage(channel, messagePeriod);

        scheduleRetryMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, function (error, responseMessage) {
            if (error)
                callback('Failed to set channel message period for channel nr. ' + channel)
            else
                callback(undefined, responseMessage);
        }.bind(this), function _validationCB(responseMessage) {
            return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        });

    };

    // Low priority search mode
    // Spec. p. 72 : "...a low priority search will not interrupt other open channels on the device while searching",
    // "If the low priority search times out, the module will switch to high priority mode"
    Host.prototype.setLowPriorityChannelSearchTimeout = function (channelNr, errorCallback, successCallback) {

        // Timeout in sec. : ucSearchTimeout * 2.5 s, 255 = infinite, 0 = disable low priority search

        var channel_low_priority_search_timeout_msg, 
            self = this,
            channel = this.channelConfiguration[channelNr], 
                message = new ANTMessage();

        if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED) {
            //channel.lowPrioritySearchTimeout = ucSearchTimeout;

            //console.log("Set channel low priority search timeout channel " + channel.number + " timeout " + channel.lowPrioritysearchTimeout);
            var buf = new Buffer([channel.number, channel.lowPrioritySearchTimeout]);

            channel_low_priority_search_timeout_msg = message.create_message(ANTMessage.prototype.MESSAGE.set_low_priority_channel_search_timeout, buf);

            this.sendAndVerifyResponseNoError(channel_low_priority_search_timeout_msg, ANTMessage.prototype.MESSAGE.set_low_priority_channel_search_timeout.id, errorCallback, successCallback);
        } else
            self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Device does not support setting low priority search");
    };

// Set High priority search timeout, each count in searchTimeout = 2.5 s, 255 = infinite, 0 = disable high priority search mode (default search timeout is 25 seconds)
    Host.prototype.setChannelSearchTimeout = function (channel, searchTimeout,callback) {

        var configurationMsg;

        verifyRange.bind(this)('channel',channel);

        configurationMsg = new SetChannelSearchTimeoutMessage(channel, searchTimeout);

        scheduleRetryMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, function (error, responseMessage) {
            if (error)
                callback('Failed to set channel search timeout for channel nr. ' + channel)
            else
                callback(undefined, responseMessage);
        }.bind(this), function _validationCB(responseMessage) {
            return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        });


    };

// Set the RF frequency, i.e 66 = 2466 MHz
    Host.prototype.setChannelRFFreq = function (channel, RFFreq, callback) {

        var configurationMsg;

        verifyRange.bind(this)('channel',channel);

        configurationMsg = new SetChannelRFFreqMessage(channel, RFFreq);

        scheduleRetryMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, function (error, responseMessage) {
            if (error)
                callback('Failed to set channel RF frequency for channel nr. ' + channel)
            else
                callback(undefined, responseMessage);
        }.bind(this), function _validationCB(responseMessage) {
            return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        });
    
    };

// Set network key for specific net
    Host.prototype.setNetworkKey = function (netNumber, key, callback) {
      
        var configurationMsg;

        verifyRange.bind(this)('network',netNumber);

        configurationMsg = new SetNetworkKeyMessage(netNumber, key);

        scheduleRetryMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, function (error, responseMessage) {
            if (error)
                callback('Failed to set network key for network nr. ' + netNumber)
            else
                callback(undefined, responseMessage);
        }.bind(this), function _validationCB(responseMessage) {
            return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        });
    };

    // Set transmit power for all channels
    Host.prototype.setTransmitPower = function (transmitPower, callback) {

        var configurationMsg;

        verifyRange.bind(this)('transmitPower', transmitPower,0,4);

        configurationMsg = new SetTransmitPowerMessage(transmitPower);

        scheduleRetryMessage.bind(this)(configurationMsg, ResponseParser.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, function (error, responseMessage) {
            if (error)
                callback('Failed to set transmit power for all channels');
            else
                callback(undefined, responseMessage);
        }.bind(this), function _validationCB(responseMessage) {
            return validateResponseNoError(responseMessage, configurationMsg.getMessageId());
        });
    };

    //Host.prototype.setSearchWaveform = function (channelNr, errorCallback, successCallback) {
    //    // waveform in little endian!

    //    var set_search_waveform_msg, self = this,
    //        buf = new Buffer(3);
    //    var channel = this.channelConfiguration[channelNr], message = new ANTMessage();

    //    if (typeof channel.searchWaveform === "undefined") {
    //        self.emit(Host.prototype.EVENT.LOG_MESSAGE, "No search waveform specified");
    //        errorCallback();
    //    }

    //    //console.log("Set channel search waveform channel " + channel.number + " waveform " + channel.searchWaveform);

    //    buf[0] = channel.number;
    //    buf[1] = channel.searchWaveform[0];
    //    buf[2] = channel.searchWaveform[1];
    //    set_search_waveform_msg = message.create_message(ANTMessage.prototype.MESSAGE.set_search_waveform, new Buffer(buf));

    //    this.sendAndVerifyResponseNoError(set_search_waveform_msg, ANTMessage.prototype.MESSAGE.set_search_waveform.id, errorCallback, successCallback);
    
    //};

    Host.prototype.openRxScanMode = function (channelNr, errorCallback, successCallback, noVerifyResponseNoError) {
        var openRxScan_channel_msg, self = this, message = new ANTMessage();
        var channel = this.channelConfiguration[channelNr];
        //self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Opening channel " + channel.number);
        openRxScan_channel_msg = message.create_message(ANTMessage.prototype.MESSAGE.open_rx_scan_mode, new Buffer([0]));

        this.sendAndVerifyResponseNoError(openRxScan_channel_msg, ANTMessage.prototype.MESSAGE.open_rx_scan_mode.id, errorCallback, successCallback, noVerifyResponseNoError);
    },

    Host.prototype.open = function (channelNr, errorCallback, successCallback, noVerifyResponseNoError) {
        //console.log("Opening channel "+ucChannel);
        var open_channel_msg, self = this;
        var channel = this.channelConfiguration[channelNr], message = new ANTMessage();
        //self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Opening channel " + channel.number);
        open_channel_msg = message.create_message(ANTMessage.prototype.MESSAGE.open_channel, new Buffer([channel.number]));

        this.sendAndVerifyResponseNoError(open_channel_msg, ANTMessage.prototype.MESSAGE.open_channel.id, errorCallback, successCallback,noVerifyResponseNoError);
    };

    // Closing first gives a response no error, then an event channel closed
    Host.prototype.close = function (channelNr, errorCallback, successCallback, noVerifyResponseNoError) {
        //console.log("Closing channel "+ucChannel);
        var close_channel_msg, self = this;
        var channel = this.channelConfiguration[channelNr], message = new ANTMessage();
        //console.log("Closing channel " + channel.number);
        close_channel_msg = message.create_message(ANTMessage.prototype.MESSAGE.close_channel, new Buffer([channel.number]));

        this.sendOnly(close_channel_msg, Host.prototype.ANT_DEFAULT_RETRY, 500, errorCallback,
            function success() {
                var retryNr = 0;

                function retryEventChannelClosed() {

                    self.read(500, errorCallback,
                        function success(data) {
                            retryNr = 0;

                            if (!self.isEvent(Host.prototype.RESPONSE_EVENT_CODES.EVENT_CHANNEL_CLOSED, data)) {
                                self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Expected event CHANNEL_CLOSED");
                                retryNr++;
                                if (retryNr < Host.prototype.ANT_RETRY_ON_CLOSE) {
                                    self.emit(Host.prototype.EVENT.LOG_MESSAGE,"Discarding "+data.inspect()+" from ANT engine packet queue. Retrying to get EVENT CHANNEL CLOSED from ANT device");
                                    retryEventChannelClosed();
                                }
                                else {
                                    self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Reached maximum number of retries. Aborting.");
                                    errorCallback();
                                }
                            }
                            else
                                successCallback();
                        });
                }

                function retryResponseNoError() {
                    self.read(500, errorCallback,
                                 function success(data) {
                                     if (!self.isResponseNoError(data, ANTMessage.prototype.MESSAGE.close_channel.id)) {
                                         self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Expected response NO ERROR for close channel");
                                         retryNr++;
                                         if (retryNr < Host.prototype.ANT_RETRY_ON_CLOSE) {
                                             self.emit(Host.prototype.EVENT.LOG_MESSAGE, " Discarding "+data.inspect()+" from ANT engine packet queue. Retrying to get NO ERROR response from ANT device");
                                             retryResponseNoError();
                                         }
                                         else {
                                             self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Reached maximum number of retries. Aborting.");
                                             errorCallback();
                                         }
                                     }
                                     else 
                                         //self.parse_response(data);

                                         // Wait for EVENT_CHANNEL_CLOSED
                                         // If channel status is tracking -> can get broadcast data packet before channel close packet

                                         retryEventChannelClosed();
                                 
                                 });
                }

                if (typeof noVerifyResponseNoError === "undefined")
                    retryResponseNoError();
                else
                    successCallback();
            });
    };

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

    //Host.prototype.sendAndVerifyResponseNoError = function (message, msgId, errorCB, successCB,noVerification) {
    //    var self = this;
    //    this.sendOnly(message, Host.prototype.ANT_DEFAULT_RETRY, Host.prototype.ANT_DEVICE_TIMEOUT, errorCB,
    //    function success() {
       
    //        //if (typeof noVerification === "undefined") {
    //        //    self.read(Host.prototype.ANT_DEVICE_TIMEOUT, errorCB,
    //        //         function success(data) {
    //        //             if (!self.isResponseNoError(data, msgId))
    //        //                 self.emit(Host.prototype.EVENT.LOG_MESSAGE, "Expected response NO ERROR"); // No retry
    //        //             self.parse_response(data);
    //        //             successCB();
    //        //         });
    //        //} else
    //        successCB(); // Skip verification, will allow prototype.listen func. to continue parsing channel data without cancelling
    //        // Drawback : will buffer unread RESPONSE_NO_ERROR -> can get multiple packets when starting listen after activateConfiguration...
    //    }
    //    );

    //};

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

    module.exports = Host;