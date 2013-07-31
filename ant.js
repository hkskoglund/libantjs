"use strict";

var events = require('events'),
    usb = require('usb'),
    util = require('util'),
    Channel = require('./channel.js');
   // DeviceProfile_ANTFS = require('./deviceProfile_ANTFS.js');

// Low level API/interface to ANT USB stick
function ANT(idVendor, idProduct, nodeInstance) {
   
    events.EventEmitter.call(this); // Call super constructor

    if (typeof idVendor === "undefined")
        throw new Error("Vendor id not specified");

    if (typeof idProduct === "undefined")
        throw new Error("Product id not specified");

    if (typeof nodeInstance === "undefined")
        throw new Error("Node instance not specified");

    this.idVendor = idVendor;
    this.idProduct = idProduct;

    this.nodeInstance = nodeInstance;

   // this.deviceProfile_ANTFS = new DeviceProfile_ANTFS(nodeInstance);

    this.retryQueue = {}; // Queue of packets that are sent as acknowledged using the stop-and wait ARQ-paradigm, initialized when parsing capabilities (number of ANT channels of device) -> a retry queue for each channel
    this.burstQueue = {}; // Queue outgoing burst packets and optionally adds a parser to the burst response

    //console.log("ANT instance instance of EventEmitter",this instanceof events.EventEmitter );

    this.addListener(ANT.prototype.EVENT.LOG_MESSAGE, this.showLogMessage);

    this.addListener(ANT.prototype.EVENT.STARTUP, this.parseNotificationStartup);
    this.addListener(ANT.prototype.EVENT.SERIAL_ERROR, this.parseNotificationSerialError);
    this.addListener(ANT.prototype.EVENT.CHANNEL_STATUS, this.parseChannelStatus);
    this.addListener(ANT.prototype.EVENT.SET_CHANNEL_ID, this.parseChannelID);
    this.addListener(ANT.prototype.EVENT.DEVICE_SERIAL_NUMBER, this.parseDeviceSerialNumber);
    this.addListener(ANT.prototype.EVENT.ANT_VERSION, this.parseANTVersion);
    this.addListener(ANT.prototype.EVENT.CAPABILITIES, this.parseCapabilities);
}

// Let ANT inherit from EventEmitter http://nodejs.org/api/util.html#util_util_inherits_constructor_superconstructor
util.inherits(ANT, events.EventEmitter);

// Continous scanning channel or background scanning channel
ANT.prototype.SCANNING_CHANNEL_TYPE = {
    CONTINOUS: 0x00,
    BACKGROUND: 0x01
};

ANT.prototype.DEFAULT_ENDPOINT_PACKET_SIZE = 64;  // Based on info in nRF24AP2 data sheet

ANT.prototype.SYNC = 0xA4; // Every raw ANT message starts with SYNC

ANT.prototype.ANT_DEVICE_TIMEOUT = 3 * 7; // Direct USB ANT communication  (normal 5-7 ms. processing time on device)

ANT.prototype.ANT_DEFAULT_RETRY = 2;

ANT.prototype.ANT_RETRY_ON_CLOSE = 10;  // Potentially get quite a lot of broadcasts in a ANT-FS channel

ANT.prototype.TX_DEFAULT_RETRY = 5; // Retry of RF acknowledged packets (including timeouts)

ANT.prototype.SEARCH_TIMEOUT = {
    INFINITE_SEARCH: 0xFF,
    DISABLE_HIGH_PRIORITY_SEARCH_MODE: 0x00
}

ANT.prototype.ANT_FREQUENCY = 57;

ANT.prototype.ANTFS_FREQUENCY = 50;

// for event emitter
ANT.prototype.EVENT = {

    // Notifications
    STARTUP: 'notificationStartup',
    SERIAL_ERROR: 'notificationSerialError',

    CHANNEL_STATUS: 'channelStatus',

    LOG_MESSAGE: 'logMessage',

    SET_CHANNEL_ID: 'setChannelId',

    DEVICE_SERIAL_NUMBER: 'deviceSerialNumber',
    ANT_VERSION: 'ANTVersion',
    CAPABILITIES: 'deviceCapabilities',

    // Data
    BROADCAST: 'broadcast',
    BURST: 'burst',

    CHANNEL_RESPONSE_EVENT : 'channelResponseEvent',

};

ANT.prototype.NOTIFICATION = {

    STARTUP: {
        POWER_ON_RESET: 0x00,
        HARDWARE_RESET_LINE: 0x01,
        WATCH_DOG_RESET: 0x02,
        COMMAND_RESET: 0x03,
        SYNCHRONOUS_RESET: 0x04,
        SUSPEND_RESET: 0x05
    },

    SERIAL_ERROR: {
        FIRST_BYTE_NOT_SYNC: 0x00,
        CRC_INCORRECT: 0x01,
        MESSAGE_TOO_LARGE: 0x02
    }
};

// ANT message ID - from sec 9.3 ANT Message Summary ANT Message Protocol And Usave Rev 50
ANT.prototype.ANT_MESSAGE = {

    // Control messages

    0x4a: "Reset system",
    reset_system: { id: 0x4a, friendly: "Reset system" },

    0x4b: "Open channel",
    open_channel: { id: 0x4b, friendly: "Open channel" },

    0x4c: "Close channel",
    close_channel: { id: 0x4c, friendly: "Close channel" },

    0x5b: "Open RX scan mode",
    open_rx_scan_mode: { id: 0x5b, friendly: "Open RX scan mode" },

    0xc5: "Sleep message",
    sleep_message: { id: 0xc5, friendly: "Sleep message" },

    // Notification messages
    0x6f: "Notification: Start up",
    startup: { id: 0x6f, friendly: "Notification: Start-up" },

    0xae: "Notification: Serial error",
    serial_error: { id: 0xae, friendly: "Notification: Serial error" },

    // Request/response

    0x4d: "Request",
    request: { id: 0x4d, friendly: "Request" },

    0x40: "Channel response/event",
    channel_response: { id: 0x40, friendly: "Channel Response/Event" },

    0x52: "Channel Status",
    channel_status: { id: 0x52, friendly: "Channel Status" },

    0x3E: "ANT version",
    ANT_version: { id: 0x3E, friendly: "ANT Version" },

    0x54: "Capabilities",
    capabilities: { id: 0x54, friendly: "Capabilities" },

    0x61: "Device serial number",
    device_serial_number: { id: 0x61, friendly: "Device Serial Number" },

    // Config messages
    // All conf. commands receive a response
    0x41: "Unassign channel",
    unassign_channel: { id: 0x41, friendly: "Unassign channel" },

    0x42: "Assign channel",
    assign_channel: { id: 0x42, friendly: "Assign channel" }, // Also sets additional parameters to defaults

    0x46: "Set network key",
    set_network_key: { id: 0x46, friendly: "Set network key" },

    0x47: "Transmit power",
    transmit_power: { id: 0x47, friendly: "Transmit power" },

    0x51: "Channel ID",
    set_channel_id: { id: 0x51, friendly: "Set channel id" },

    0x43: "Channel period (Tch)",
    set_channel_messaging_period: { id: 0x43, friendly: "Set Channel Messaging Period" },

    0x63: "Low priority (LP) search timeout",
    set_low_priority_channel_search_timeout: { id: 0x63, friendly: "Set low priority (LP) Channel Search Timeout" },

    0x44: "High priority (HP) search timeout",
    set_channel_search_timeout: { id: 0x44, friendly: "Set High priority (HP) Channel Search Timeout" },

    0x45: "Channel RF frequency",
    set_channel_RFFreq: { id: 0x45, friendly: "Set Channel RF Frequency" },

    0x49: "Search waveform",
    set_search_waveform: { id: 0x49, friendly: "Set search waveform" },

    0x75: "Channel Search Priority",
    set_channel_search_priority: { id: 0x75, friendly: "Set channel search priority" },

    0x6E: "Lib Config",
    libConfig: { id: 0x6E, friendly: "Lib Config" },

    0x66: "Enable Extended Messages",
    RxExtMesgsEnable : { id : 0x66, friendly : "Enable Extended Messages" },

    // Data message

    0x4E: "Broadcast Data",
    broadcast_data: { id: 0x4e, friendly: "Broadcast data" },

    0x4F: "Acknowledged Data",
    acknowledged_data: { id: 0x4f, friendly: "Acknowledged data" },

    0x50: "Burst Transfer Data",
    burst_transfer_data: { id: 0x50, friendly: "Burst transfer data" },

    0x72: "Advanced Burst Transfer Data",
    advanced_burst_transfer_data: { id: 0x72, friendly: "Advanced burst transfer data" },

};

ANT.prototype.RESPONSE_EVENT_CODES = {

    RESPONSE_NO_ERROR: 0x00,
    0x00: { friendly: "RESPONSE_NO_ERROR" },

    EVENT_RX_SEARCH_TIMEOUT: 0x01,
    0x01: { friendly: "EVENT_RX_SEARCH_TIMEOUT", comment : "The search is terminated, and the channel has been automatically closed." },

    EVENT_RX_FAIL: 0x02,
    0x02: { friendly: "EVENT_RX_FAIL" },

    EVENT_TX: 0x03,
    0x03: { friendly: "EVENT_TX" },
    
    EVENT_TRANSFER_RX_FAILED: 0x04,
    0x04: { friendly: "EVENT_TRANSFER_RX_FAILED" },

    EVENT_TRANSFER_TX_COMPLETED: 0x05,
    0x05: { friendly: "EVENT_TRANSFER_TX_COMPLETED" },

    EVENT_TRANSFER_TX_FAILED: 0x06,
    0x06: { friendly: "EVENT_TRANSFER_TX_FAILED" },

    EVENT_CHANNEL_CLOSED: 0x07,
    0x07: { friendly: "EVENT_CHANNEL_CLOSED" },

    EVENT_RX_FAIL_GO_TO_SEARCH: 0x08,
    0x08: { friendly: "EVENT_RX_FAIL_GO_TO_SEARCH" },

    EVENT_CHANNEL_COLLISION: 0x09,
    0x09: { friendly: "EVENT_CHANNEL_COLLISION" },

    EVENT_TRANSFER_TX_START: 0x0A,
    0x0A: { friendly: "EVENT_TRANSFER_TX_START" },

    EVENT_TRANSFER_NEXT_DATA_BLOCK: 0x11,
    0x11: { friendly: "EVENT_TRANSFER_NEXT_DATA_BLOCK" },

    CHANNEL_IN_WRONG_STATE: 0x15,
    0x15: { friendly: "CHANNEL_IN_WRONG_STATE" },

    CHANNEL_NOT_OPENED: 0x16,
    0x16: { friendly: "CHANNEL_NOT_OPENED" },

    CHANNEL_ID_NOT_SET: 0x18,
    0x18: { friendly: "CHANNEL_ID_NOT_SET" },

    CLOSE_ALL_CHANNELS: 0x19,
    0x19: { friendly: "CLOSE_ALL_CHANNELS" },

    TRANSFER_IN_PROGRESS: 0x1F,
    0x1F: { friendly: "TRANSFER_IN_PROGRESS" },

    TRANSFER_SEQUENCE_NUMBER_ERROR: 0x20,
    0x20: { friendly: "TRANSFER_SEQUENCE_NUMBER_ERROR" },

    TRANSFER_IN_ERROR: 0x21,
    0x21: { friendly: "TRANSFER_IN_ERROR" },

    MESSAGE_SIZE_EXCEEDS_LIMIT: 0x27,
    0x27: { friendly: "MESSAGE_SIZE_EXCEEDS_LIMIT" },

    INVALID_MESSAGE: 0x28,
    0x28: { friendly: "INVALID_MESSAGE" },

    INVALID_NETWORK_NUMBER: 0x29,
    0x29: { friendly: "INVALID_NETWORK_NUMBER" },

    INVALID_LIST_ID: 0x30,
    0x30: { friendly: "INVALID_LIST_ID" },

    INVALID_SCAN_TX_CHANNEL: 0x31,
    0x31: { friendly: "INVALID_SCAN_TX_CHANNEL" },

    INVALID_PARAMETER_PROVIDED: 0x33,
    0x33: { friendly: "INVALID_PARAMETER_PROVIDED" },

    EVENT_SERIAL_QUEUE_OVERFLOW: 0x34,
    0x34: { friendly: "EVENT_SERIAL_QUEUE_OVERFLOW" },

    EVENT_QUEUE_OVERFLOW: 0x35,
    0x35: { friendly: "EVENT_QUEUE_OVERFLOW" },

    NVM_FULL_ERROR: 0x40,
    0x40: { friendly: "NVM_FULL_ERROR" },

    NVM_WRITE_ERROR: 0x41,
    0x41: { friendly: "NVM_WRITE_ERROR" },

    USB_STRING_WRITE_FAIL: 0x70,
    0x70: { friendly: "USB_STRING_WRITE_FAIL" },

    MESG_SERIAL_ERROR_ID: 0xAE,
    0xAE: { friendly: "MESG_SERIAL_ERROR_ID" },

    ENCRYPT_NEGOTIATION_SUCCESS: 0x38,
    0x38: { friendly: "ENCRYPT_NEGOTIATION_SUCCESS" },

    ENCRYPT_NEGOTIATION_FAIL: 0x39,
    0x39: { friendly: "ENCRYPT_NEGOTIATION_FAIL" },
};

ANT.prototype.CHANNEL_STATUS = {
    0x00: "Un-Assigned",
    0x01: "Assigned",
    0x02: "Searching",
    0x03: "Tracking",
    UN_ASSIGNED: 0x00,
    ASSIGNED: 0x01,
    SEARCHING: 0x02,
    TRACKING: 0x03
};



// From spec. p. 17 - "an 8-bit field used to define certain transmission characteristics of a device" - shared address, global data pages.
// For ANT+/ANTFS :

ANT.prototype.parseTransmissionType = function (transmissionType) {
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

ANT.prototype.parseChannelID = function (data,relIndex) {


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

        //this.emit(ANT.prototype.EVENT.LOG_MESSAGE, channelID.toString());

    } else {
        console.log(Date.now(), "Attempt to read beyond data buffer length data length", data.length, "relativeIndex", relativeIndex, data);
    }
   
    //console.log(channelID.toString());
    return channelID;
};

ANT.prototype.parseChannelStatus = function (data) {

    //console.log("THIS", this);

    var channelStatus = {
        channelNumber: data[3],
        channelType: (data[4] & 0xF0) >> 4,  // Bit 4:7
        networkNumber: (data[4] & 0x0C) >> 2, // Bit 2:3
        channelState: data[4] & 0x03, // Bit 0:1

    };

    channelStatus.channelStateFriendly = ANT.prototype.CHANNEL_STATUS[channelStatus.channelState];

    channelStatus.toString = function () {
        return "Channel status " + channelStatus.channelNumber + " type " + Channel.prototype.CHANNEL_TYPE[channelStatus.channelType] + " (" + channelStatus.channelType + " ) network " + channelStatus.networkNumber + " " + channelStatus.channelStateFriendly;
    };

    // Update channel configuration
    if (typeof this.channelConfiguration[channelStatus.channelNumber] === "undefined") {
        //this.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Creating new channel configuration for channel to hold channel status for channel " + channelStatus.channelNumber);
        this.channelConfiguration[channelStatus.channelNumber] = { number: channelStatus.channelNumber };
    }

    this.channelConfiguration[channelStatus.channelNumber].channelStatus = channelStatus;

    //this.emit(ANT.prototype.EVENT.LOG_MESSAGE, channelStatus.toString());

    return channelStatus;
};

ANT.prototype.showLogMessage = function (msg) {
    console.log(Date.now(), msg);
};

ANT.prototype.parseNotificationStartup = function (data) {
    var msg, code;


    if (data[3] === 0) {
        msg = "POWER_ON_RESET (cold reset)";
        code = ANT.prototype.NOTIFICATION.STARTUP.POWER_ON_RESET;
    }
    else if (data[3] === 1) {
        msg = "HARDWARE_RESET_LINE";
        code = ANT.prototype.NOTIFICATION.STARTUP.HARDWARE_RESET_LINE;
    }
    else if (data[3] & (1 << 2)) {
        msg = "WATCH_DOG_RESET";
        code = ANT.prototype.NOTIFICATION.STARTUP.WATCH_DOG_RESET;
    }
    else if (data[3] & (1 << 5)) {
        msg = "COMMAND_RESET (warm reset)";
        code = ANT.prototype.NOTIFICATION.STARTUP.COMMAND_RESET;
    }
    else if (data[3] & (1 << 6)) {
        msg = "SYNCHRONOUS_RESET";
        code = ANT.prototype.NOTIFICATION.STARTUP.SYNCHRONOUS_RESET;
    }
    else if (data[3] & (1 << 7)) {
        msg = "SUSPEND_RESET";
        code = ANT.prototype.NOTIFICATION.STARTUP.SUSPEND_RESET;
    }

    this.emit(ANT.prototype.EVENT.LOG_MESSAGE, ANT.prototype.ANT_MESSAGE.startup.friendly + " " + msg);

    this.notificationStartup = {
        timestamp: Date.now(),
        message: msg,
        code: code
    };

    return code;

};

ANT.prototype.parseNotificationSerialError = function (data) {
    var msg, code;

    if (data[3] === 0) {
        msg = "First byte is not SYNC = 0xA4";
        code = ANT.prototype.NOTIFICATION.SERIAL_ERROR.FIRST_BYTE_NOT_SYNC;
    }
    else if (data[3] === 2) {
        msg = "Checksum incorrect";
        code = ANT.prototype.NOTIFICATION.SERIAL_ERROR.CRC_INCORRECT;
    }
    else if (data[3] === 3) {
        msg = "Message too large";
        code = ANT.prototype.NOTIFICATION.SERIAL_ERROR.MESSAGE_TOO_LARGE;
    }

    this.notificationSerialError = {
        timestamp: Date.now(),
        message: msg,
        code: code
    };

    this.emit(ANT.prototype.EVENT.LOG_MESSAGE, ANT.prototype.ANT_MESSAGE.serial_error.friendly + " " + msg);

    return code;
};

ANT.prototype.parseChannelResponse = function (data) {
    var channel = data[3],
        msgId = data[4],
        msgCode = data[5],
            msg;

    if (msgId === 1) // Set to 1 for RF event
        msg = "EVENT on channel " + channel + " " + ANT.prototype.RESPONSE_EVENT_CODES[msgCode].friendly;
    else
        msg = "RESPONSE on channel " + channel + " to msg. id 0x" + msgId.toString(16) + "  " + ANT.prototype.ANT_MESSAGE[msgId] + " " + ANT.prototype.RESPONSE_EVENT_CODES[msgCode].friendly;

    
    //this.emit(ANT.prototype.EVENT.LOG_MESSAGE, msg);

    return msg;
};

ANT.prototype.parseANTVersion = function (data) {
    this.ANTVersion = data.toString('utf8', 3, 13);

    this.emit(ANT.prototype.EVENT.LOG_MESSAGE, "ANT Version: " + this.ANTVersion);

    return this.ANTVersion;
};

ANT.prototype.RSSI =
    {
        MEASUREMENT_TYPE: {
            DBM: 0x20
        }
    };

ANT.prototype.parse_extended_RSSI = function (channelNr,data,startIndex) {
    //console.log("CHANNEL NR: ",channelNr,"startIndex",startIndex,"data:",data);
    // http://www.thisisant.com/forum/viewthread/3841 -> not supported on nRF24AP2....
    // Create new RSSI object if not available
    var self = this;
    if (typeof this.channelConfiguration[channelNr].RSSI === "undefined")
        this.channelConfiguration[channelNr].RSSI = {};

    this.channelConfiguration[channelNr].RSSI.measurementType = data[startIndex];

    if (this.channelConfiguration[channelNr].RSSI.measurementType === ANT.prototype.RSSI.MEASUREMENT_TYPE.DBM) {
        this.channelConfiguration[channelNr].RSSI.value = data[startIndex + 1];
        this.channelConfiguration[channelNr].RSSI.thresholdConfigurationValue = data[startIndex + 2];
    }
    //else
    //    this.emit(ANT.prototype.EVENT.LOG_MESSAGE, " Cannot decode RSSI, unknown measurement type " + this.channelConfiguration[channelNr].RSSI.measurementType);

    //console.log(this.channelConfiguration[channelNr].RSSI);
    this.channelConfiguration[channelNr].RSSI.toString = function () {
        var str;

        str = "Measurement type 0x" + self.channelConfiguration[channelNr].RSSI.measurementType.toString(16);

        if (self.channelConfiguration[channelNr].RSSI.value)
            str += " RSSI value " + self.channelConfiguration[channelNr].RSSI.value;

        if (self.channelConfiguration[channelNr].RSSI.thresholdConfigurationValue)
            str += " Threshold conf. value " + self.channelConfiguration[channelNr].RSSI.thresholdConfigurationValue;

        return str;
    }

    return this.channelConfiguration[channelNr].RSSI;

};

// Parsing of the "flagged extended data message format"
ANT.prototype.parse_extended_message = function (channelNr,data) {
    var msgLength = data[1], msgFlag,
        self = this,
        relativeIndex = 9,
        previous_RX_Timestamp;
        

    if (msgLength <= relativeIndex) {
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, " No extended message info. available");
        return;
    }

    //console.log("Extended message flag + {channelID+RSSI+RX_Timestamp} + CRC", data.slice(4+8), "message length:",msgLength);

    msgFlag = data[12];

    // Check for channel ID
    // p.37 spec: relative order of extended messages; channel ID, RSSI, timestamp (based on 32kHz clock, rolls over each 2 seconds)

    if (msgFlag & ANT.prototype.LIB_CONFIG.ENABLE_CHANNEL_ID) {
        this.parseChannelID(data, relativeIndex);
        relativeIndex = relativeIndex + 8; // Channel ID = Device Number 2-bytes + Device type 1 byte + Transmission Type 1 byte
    }

    if (msgFlag & ANT.prototype.LIB_CONFIG.ENABLE_RSSI) {
        this.parse_extended_RSSI(channelNr,data, relativeIndex);
        relativeIndex = relativeIndex + 4;
    }

    if (msgFlag & ANT.prototype.LIB_CONFIG.ENABLE_RX_TIMESTAMP) {
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

// Overview on p. 58 - ANT Message Protocol and Usage
ANT.prototype.parse_response = function (data) {

    //console.log("parse_response", this);

    var antInstance = this, self = this,
        firstSYNC = data[0],
        msgLength = data[1],
        msgID = data[2],
        msgFlag, // Indicates if extended message info. is available and what info. to expect
        msgStr = "",
        msgCode,
        channelNr,
        channelID,
        sequenceNr,
        payloadData,
        resendMsg,
        burstMsg,
        burstParser;

    // Check for valid SYNC byte at start

    if (firstSYNC !== ANT.prototype.SYNC) {
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, " Invalid SYNC byte "+ firstSYNC+ " expected "+ ANT.prototype.SYNC+" cannot trust the integrety of data, thus discarding bytes:"+ data.length);
        return;
    }

    switch (msgID) {

        // Data

        case ANT.prototype.ANT_MESSAGE.burst_transfer_data.id:
            
            channelNr = data[3] & 0x1F; // 5 lower bits
            sequenceNr = (data[3] & 0xE0) >> 5; // 3 upper bits

            if (msgLength >= 9) { // 1 byte for channel NR + 8 byte payload - standard message format

                msgStr += "BURST on CHANNEL " + channelNr + " SEQUENCE NR " + sequenceNr;
                if (sequenceNr & 0x04) // last packet
                    msgStr += " LAST";

                payloadData = data.slice(4, 12);

                // Assemble burst data packets on channelConfiguration for channel, assume sequence number are received in order ...

                // console.log(payloadData);

                if (sequenceNr === 0x00) // First packet 
                {
                    // console.time('burst');
                    antInstance.channelConfiguration[channelNr].startBurstTimestamp = Date.now();

                    antInstance.channelConfiguration[channelNr].burstData = payloadData; // Payload 8 bytes

                    // Extended msg. only in the first packet
                    if (msgLength > 9) {
                        msgFlag = data[12];
                        //console.log("Extended msg. flag : 0x"+msgFlag.toString(16));
                        this.parse_extended_message(channelNr, data);
                    }
                }
                else if (sequenceNr > 0x00)

                    antInstance.channelConfiguration[channelNr].burstData = Buffer.concat([antInstance.channelConfiguration[channelNr].burstData, payloadData]);

                if (sequenceNr & 0x04) // msb set === last packet 
                {
                    //console.timeEnd('burst');
                    antInstance.channelConfiguration[channelNr].endBurstTimestamp = Date.now();

                    var diff = antInstance.channelConfiguration[channelNr].endBurstTimestamp - antInstance.channelConfiguration[channelNr].startBurstTimestamp;

                    // console.log("Burst time", diff, " bytes/sec", (antInstance.channelConfiguration[channelNr].burstData.length / (diff / 1000)).toFixed(1), "bytes:", antInstance.channelConfiguration[channelNr].burstData.length);

                    burstMsg = antInstance.burstQueue[channelNr][0];
                    if (typeof burstMsg !== "undefined")
                        burstParser = burstMsg.parser;

                    if (!antInstance.channelConfiguration[channelNr].emit(Channel.prototype.EVENT.BURST, channelNr, antInstance.channelConfiguration[channelNr].burstData, burstParser))
                        antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event Channel.prototype.EVENT.BURST on channel "+channelNr);
                    else
                        antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Burst data received " + antInstance.channelConfiguration[channelNr].burstData.length+" bytes time "+ diff + " ms rate "+(antInstance.channelConfiguration[channelNr].burstData.length / (diff / 1000)).toFixed(1)+" bytes/sec");

                    //antInstance.channelConfiguration[channelNr].parseBurstData(antInstance.channelConfiguration[channelNr].burstData, burstParser);
                }
            }
            else {
                console.trace();
                console.log("Data", data);
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Cannot handle this message of "+msgLength+ " bytes. Expecting a message length of 9 for standard messages or greater for extended messages (channel ID/RSSI/RX timestamp)");
            }

            break;

        case ANT.prototype.ANT_MESSAGE.broadcast_data.id:

            msgStr += ANT.prototype.ANT_MESSAGE.broadcast_data.friendly + " ";

            channelNr = data[3];
            msgStr += " on channel " + channelNr;

            // Parse flagged extended message info. if neccessary
            if (msgLength > 9) {
                msgFlag = data[12];
                //console.log("Extended msg. flag : 0x"+msgFlag.toString(16));
                this.parse_extended_message(channelNr, data); // i.e channel ID
            }

            // Check for updated channel ID to the connected device (ONLY FOR IF CHANNEL ID IS NOT ENABLED IN EXTENDED PACKET INFO)

            if (typeof antInstance.channelConfiguration[channelNr].hasUpdatedChannelID === "undefined") {

                antInstance.getUpdatedChannelID(channelNr,
                    function error() {
                        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Failed to get updated channel ID");
                    },
                   function success(data) {
                       antInstance.channelConfiguration[channelNr].hasUpdatedChannelID = true;
                   });

            }

            // Call to broadcast handler for channel
            if (!antInstance.channelConfiguration[channelNr].emit(Channel.prototype.EVENT.BROADCAST, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event Channel.prototype.EVENT.BROADCAST on channel "+channelNr);

            //antInstance.channelConfiguration[channelNr].broadCastDataParser(data);

            break;

            // Notifications from ANT engine

        case ANT.prototype.ANT_MESSAGE.startup.id:

            if (!antInstance.emit(antInstance.EVENT.STARTUP, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.STARTUP");

            break;

        case ANT.prototype.ANT_MESSAGE.serial_error.id:

            if (!antInstance.emit(antInstance.EVENT.SERIAL_ERROR, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.SERIAL_ERROR");

            break;

            // Channel event or responses

        case ANT.prototype.ANT_MESSAGE.channel_response.id:

            var channelResponseMessage = antInstance.parseChannelResponse(data);

            //console.log(Date.now(),channelResponseMessage, data);
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, channelResponseMessage);

            msgStr += ANT.prototype.ANT_MESSAGE.channel_response.friendly + " " + channelResponseMessage;
            channelNr = data[3];

            // Handle retry of acknowledged data
            if (antInstance.isEvent(ANT.prototype.RESPONSE_EVENT_CODES.EVENT_TRANSFER_TX_COMPLETED, data)) {

                if (antInstance.retryQueue[channelNr].length >= 1) {
                    resendMsg = antInstance.retryQueue[channelNr].shift();
                    clearTimeout(resendMsg.timeoutID); // No need to call timeout callback now
                    if (typeof resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB === "function")
                        resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB();
                    else
                        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, " No transfer complete callback specified after acknowledged data");
                    //console.log(Date.now() + " TRANSFER COMPLETE - removing from retry-queue",resendMsg);
                }

                if (antInstance.burstQueue[channelNr].length >= 1) {
                    resendMsg = antInstance.burstQueue[channelNr].shift();
                    if (typeof resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB === "function")
                        resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB();
                    else
                        antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE," No transfer complete callback specified after burst");
                }

            } else if (antInstance.isEvent(ANT.prototype.RESPONSE_EVENT_CODES.EVENT_TRANSFER_TX_FAILED, data)) {
                if (antInstance.retryQueue[channelNr].length >= 1) {
                    resendMsg = antInstance.retryQueue[channelNr][0];
                    resendMsg.retryCB();
                }

                if (antInstance.burstQueue[channelNr].length >= 1) {
                    resendMsg = antInstance.burstQueue[channelNr][0];
                    resendMsg.retryCB();
                }
            }

            // Call channel event/response-handler for each channel

           // OLD-way of calling callback antInstance.channelConfiguration[channelNr].channelResponseEvent(data);

           // console.log("Channel response/EVENT", channelNr, channelResponseMessage,antInstance.channelConfiguration[channelNr]);
            antInstance.channelConfiguration[channelNr].emit(Channel.prototype.EVENT.CHANNEL_RESPONSE_EVENT, data, channelResponseMessage);


            break;

            // Response messages to request 

            // Channel specific 

        case ANT.prototype.ANT_MESSAGE.channel_status.id:
            if (!antInstance.emit(ANT.prototype.EVENT.CHANNEL_STATUS, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.CHANNEL_STATUS");

            break;

        case ANT.prototype.ANT_MESSAGE.set_channel_id.id:
            if (!antInstance.emit(ANT.prototype.EVENT.SET_CHANNEL_ID, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No listener for event ANT.prototype.EVENT.SET_CHANNEL_ID");
            break;

            // ANT device specific, i.e nRF24AP2

        case ANT.prototype.ANT_MESSAGE.ANT_version.id:
            if (!antInstance.emit(ANT.prototype.EVENT.ANT_VERSION, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.ANT_VERSION");
            break;

        case ANT.prototype.ANT_MESSAGE.capabilities.id:

            if (!antInstance.emit(ANT.prototype.EVENT.CAPABILITIES, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.CAPABILITIES");

            break;

        case ANT.prototype.ANT_MESSAGE.device_serial_number.id:
            if (!antInstance.emit(ANT.prototype.EVENT.DEVICE_SERIAL_NUMBER, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.DEVICE_SERIAL_NUMBER");

            break;

        default:
            //msgStr += "* NO parser specified *";
            antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Unable to parse received data");
            break;
    }




    //if (msgID !== ANT.prototype.ANT_MESSAGE.burst_transfer_data.id) // Avoid burst logging -> gives performance problems
    //    console.log(Date.now() + " Rx: ", data, msgStr);


    //for (var byteNr = 0; byteNr < data.length; byteNr++) {
    //    if (byteNr === 0 && data[byteNr] === SYNC)
    //        console.log("Buffer index " + byteNr + ", value: " + data[byteNr] + " = SYNC");
    //    else if (byteNr === 1)
    //        console.log("Buffer index " + byteNr + ", value: " + data[byteNr] + " = LENGTH");
    //    else if (byteNr === 2)
    //        console.log("Buffer index " + byteNr + ", value: " + data[byteNr] + " = ID");
    //    else if (byteNr === data.length - 1)
    //        console.log("Buffer index " + byteNr + ", value: " + data[byteNr] + " = CHECKSUM");
    //    else
    //        console.log("Buffer index " + byteNr + ", value: " + data[byteNr]);
    //}


    // There might be more buffered data messages from ANT engine available (if commands/request are sent, but not read in awhile)

    var nextExpectedSYNCIndex = 1 + msgLength + 2 + 1;
    if (data.length > nextExpectedSYNCIndex) {
       // console.log(data.slice(nextExpectedSYNCIndex));
        this.parse_response(data.slice(nextExpectedSYNCIndex));
    }

};

// Continuously listen on incoming packets from ANT engine and send it to the general parser for further processing
ANT.prototype.listen = function (transferCancelledCallback) {

    var self = this, NO_TIMEOUT = 0, TIMEOUT = 30000, msgLength, channelNr;

    function retry() {

        var errorCB = function error(err) {

            if (err.errno === usb.LIBUSB_TRANSFER_TIMED_OUT) {
                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Timeout: No ANT data received in "+TIMEOUT+ " ms.");
                process.nextTick(retry);
            }
            else if (err.errno === usb.LIBUSB_TRANSFER_CANCELLED) {
                //console.log(error);
                // Transfer cancelled, may be aborted by pressing Ctrl-C in Node.js 
                if (typeof transferCancelledCallback === "function") {
                    //self.emit(ANT.prototype.EVENT.LOG_MESSAGE,"Calling cancellation callback "+transferCancelledCallback.name);
                    transferCancelledCallback();
                }
                else
                    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No transfer cancellation callback specified");
               
            } else { 
                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Receive error in listen:" + err);
                process.nextTick(retry);
            }

        },

        successCB = function success(data) {
            msgLength = data[1];
            channelNr = data[3];
            //if (data.length > 1 + msgLength + 2+1) {
            //    //console.log(data.inspect());
            //    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Buffered data (more than one data message) received on channel "+channelNr+ ", length of data " + data.length + " bytes");
            //}
            self.parse_response.call(self, data);
            process.nextTick(retry);
        };

       
         self.read(TIMEOUT, errorCB , successCB);
    }

    // self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Listening for ANT data");

   // console.log(self.inTransfer);

    retry();

};

/*
This function create a raw message 
// Message format
// SYNC MSG_LENGTH MSG_ID MSG_CONTENT (byte  0 - N -1) Checksum
// SYNC = 10100100 = 0xA4 or 10100101 (MSB:LSB)
// CheckSUM = XOR of all bytes in message
Content = Buffer
// Sending of LSB first = little endian NB!
*/
ANT.prototype.create_message = function (message, content) {
    var index;

    var headerBuffer = new Buffer(3), contentBuffer, messageBuffer, trailingZeroBuffer;

    var content_len;
    if (content)
        content_len = content.length;
    else {
        this.emit(ANT.prototype.EVENT.LOG_MESSAGE,"Content length is 0");
        content_len = 0;
    }

    //console.log("Message id. ", message.id, " Content is ", content);

    contentBuffer = new Buffer(content_len);
    //if (content_len > 8)
    //    console.warn("Content length of message is ", content_len);

    // Header
    // SYNC = 0; // -> Provoke Serial Error Message, error 0 - SYNC incorrect, should be 0xA4

    headerBuffer.writeUInt8(ANT.prototype.SYNC, 0);
    headerBuffer.writeUInt8(content_len, 1);
    headerBuffer.writeUInt8(message.id, 2);

    // Content
    for (var byteNr = 0; byteNr < content_len; byteNr++)
        contentBuffer.writeUInt8(content.readUInt8(byteNr), byteNr);

    messageBuffer = Buffer.concat([headerBuffer, contentBuffer], 3 + content_len);

    // Checksum
    //console.log("Message buffer:", messageBuffer, "Message buffer length", messageBuffer.length, " content length: ", content_len, "content buffer: ", contentBuffer);

    var checksum = messageBuffer.readUInt8(0);
    //console.log("Start checksum", checksum);
    for (byteNr = 1; byteNr < messageBuffer.length; byteNr++) {
        checksum = checksum ^ messageBuffer.readUInt8(byteNr);
        //console.log("Checksum", checksum, "byte nr", byteNr, "value:", messageBuffer.readUInt8(byteNr));
    }

    //checksum = 0; // -> Provoke Serial Error Message, error 2 - checksum of ANT msg. incorrect
    messageBuffer = Buffer.concat([messageBuffer, new Buffer([checksum])], 4 + content_len);

    //console.log("Checksum  : " + checksum);
    //console.log("Raw message length : " + msg.length+", content length: "+content_len);

    // Add trailing zeroes - seems to work ok without trailing zeros, but recommended

    if (content_len < 8) {
        trailingZeroBuffer = new Buffer(8 - content_len - 1); // CRC included in payload
        for (byteNr = 0; byteNr < 8 - content_len - 1; byteNr++)
            trailingZeroBuffer.writeUInt8(0, byteNr);

        messageBuffer = Buffer.concat([messageBuffer, trailingZeroBuffer]);
    }

    //console.log("Created message : ", messageBuffer)

    return {
        id: message.id,
        buffer: messageBuffer,
        friendly: message.friendly
    };
};

// ANT Message Protocol and Usage. rev 5.0b - page 115
ANT.prototype.parseCapabilities = function (data) {
    var maxANTChannels = data[3],
        maxNetworks = data[4],
        standardOptions = data[5],
        advancedOptions = data[6],
        advancedOptions2 = data[7],
        advancedOptions3 = data[8],
            self = this;

    //console.log("self in parseCapabilities is", self);
    self.capabilities = {

        MAX_CHAN: maxANTChannels,
        MAX_NET: maxNetworks,

        raw: {
            standardOptions: standardOptions,
            advancedOptions: advancedOptions,
            advancedOptions2: advancedOptions2,
            advancedOptions3: advancedOptions3
        },

        options: {

            CAPABILITIES_NO_RECEIVE_CHANNELS: standardOptions & 0x01,
            CAPABILITIES_NO_TRANSMIT_CHANNELS: standardOptions & 0x02,
            CAPABILITIES_NO_RECEIVE_MESSAGES: standardOptions & (1 << 3),
            CAPABILITIES_NO_TRANSMIT_MESSAGES: standardOptions & (1 << 4),
            CAPABILITIES_NO_ACKD_MESSAGES: standardOptions & (1 << 5),
            CAPABILITIES_NO_BURST_MESSAGES: standardOptions & (1 << 6),

            CAPABILITIES_NETWORK_ENABLED: advancedOptions & 0x02,
            CAPABILITIES_SERIAL_NUMBER_ENABLED: advancedOptions & (1 << 3),
            CAPABILITIES_PER_CHANNEL_TX_POWER_ENABLED: advancedOptions & (1 << 4),
            CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED: advancedOptions & (1 << 5),
            CAPABILITIES_SCRIPT_ENABLED: advancedOptions & (1 << 6),
            CAPABILITIES_SEARCH_LIST_ENABLED: advancedOptions & (1 << 7),

            CAPABILITIES_LED_ENABLED: advancedOptions2 & 0x01,
            CAPABILITIES_EXT_MESSAGE_ENABLED: advancedOptions2 & 0x02,
            CAPABILITIES_SCAN_MODE_ENABLED: advancedOptions2 & (1 << 2),
            CAPABILITIES_PROXY_SEARCH_ENABLED: advancedOptions2 & (1 << 4),
            CAPABILITIES_EXT_ASSIGN_ENABLED: advancedOptions2 & (1 << 5),
            CAPABILITIES_FS_ANTFS_ENABLED: advancedOptions2 & (1 << 6), // (1 << n) = set bit n high (bit numbered from 0 - n)

            CAPABILITIES_ADVANCED_BURST_ENABLED: advancedOptions3 & 0x01,
            CAPABILITIES_EVENT_BUFFERING_ENABLED: advancedOptions3 & 0x02,
            CAPABILITIES_EVENT_FILTERING_ENABLED: advancedOptions3 & (1 << 2),
            CAPABILITIES_HIGH_DUTY_SEARCH_ENABLED: advancedOptions3 & (1 << 3),
            CAPABILITIES_SELECTIVE_DATA_ENABLED: advancedOptions3 & (1 << 6)
        }
    };

    //console.log(self.capabilities);

    var msg = "Capabilities: channels " + maxANTChannels + " networks " + maxNetworks + " : ";

    for (var prop in self.capabilities.options)
        if (self.capabilities.options[prop])
            msg += prop.substring(13, prop.length - 8) + " ";

    self.capabilities.toString = function () { return msg; };

    self.channelConfiguration = new Array(self.capabilities.MAX_CHAN);

    // Init Retry queue of acknowledged data packets
    for (var channelNr = 0; channelNr < self.capabilities.MAX_CHAN; channelNr++) {
        self.retryQueue[channelNr] = [];
        self.burstQueue[channelNr] = [];
    }

    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, self.capabilities.toString());

    return self.capabilities;

};

// Get device capabilities
ANT.prototype.getCapabilities = function (completeCB) {
    var msgId;
    var self = this;

    self.sendOnly(self.request(undefined, self.ANT_MESSAGE.capabilities.id),
        ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
       // function validation(data) { msgId = data[2]; return (msgId === self.ANT_MESSAGE.capabilities.id); },
        function error() { self.emit(ANT.prototype.EVENT.LOG_MESSAGE,"Failed to get device capabilities."); completeCB(); },
        function success() {
            self.read(ANT.prototype.ANT_DEVICE_TIMEOUT, completeCB,
                function success(data) {
                    var msgId = data[2];
                    if (msgId !== self.ANT_MESSAGE.capabilities.id)
                        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Expected capabilities message response");
                    self.parse_response(data);
                    if (typeof completeCB === "function")
                        completeCB();
                    else
                        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Found no callback after getCapabilities");
                });
        });
};

// Get ANT device version
ANT.prototype.getANTVersion = function (callback) {
    var msgId;
    var self = this;

    self.sendOnly(self.request(undefined, self.ANT_MESSAGE.ANT_version.id),
        ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
        //function validation(data) { msgId = data[2]; return (msgId === self.ANT_MESSAGE.ANT_version.id); },
        function error() { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Failed to get ANT version."); callback(); },
        function success() {
            self.read(ANT.prototype.ANT_DEVICE_TIMEOUT, callback,
               function success(data) {
                   var msgId = data[2];
                   if (msgId !== self.ANT_MESSAGE.ANT_version.id)
                       self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Expected version message response");
                   self.parse_response(data);
                   if (typeof callback === "function")
                       callback();
                   else
                       self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Found no callback after getANTVersion");
               });

        });
};

// Get device serial number if available
ANT.prototype.parseDeviceSerialNumber = function (data) {
    // SN 4 bytes Little Endian
    var sn = data.readUInt32LE(3),
      msg = "ANT device serial number: " + sn,
        self = this;

    if (typeof self.serialNumber === "undefined")
        self.serialNumber = sn;
    else {
        this.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Overwriting previously defined serial number for device : "+ self.serialNumber+ "read new serial number:"+ sn);
        self.serialNumber = sn;
    }

    this.emit(ANT.prototype.EVENT.LOG_MESSAGE, msg);

    return sn;
};

ANT.prototype.getDeviceSerialNumber = function (callback) {
    var msgId;
    var self = this;

    if (typeof self.capabilities === "undefined") {
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "getCapabilities should be run first to determine if device supports serial number");
    } else if (self.capabilities.options.CAPABILITIES_SERIAL_NUMBER_ENABLED)
        self.sendOnly(self.request(undefined, self.ANT_MESSAGE.device_serial_number.id),
            ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
            //function validation(data) { msgId = data[2]; return (msgId === self.ANT_MESSAGE.device_serial_number.id); },
            function error() { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Failed to get device serial number"); callback(); },
            function success() {
                self.read(ANT.prototype.ANT_DEVICE_TIMEOUT, callback,
               function success(data) {
                   var msgId = data[2];
                   if (msgId !== self.ANT_MESSAGE.device_serial_number.id)
                       self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Expected device serial number message response");

                   self.parse_response(data);
                   if (typeof callback === "function")
                       callback();
                   else
                       self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Found no callback after getDeviceSerialNumber");
               });
            });
    else
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Device does not have a serial number");
};

ANT.prototype.getChannelStatus = function (channelNr, errorCallback, successCallback) {
    var msgId, self = this;

    self.sendOnly(self.request(channelNr, self.ANT_MESSAGE.channel_status.id),
        ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
        //function validation(data) { msgId = data[2]; return (msgId === ANT_MESSAGE.set_channel_id.id); },
        function error() {
            if (typeof errorCallback === "function")
                errorCallback();
            else
                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Found no error callback");
        },
        function success() {
            var retryNr = 0;

            function retry() {
                self.read(ANT.prototype.ANT_DEVICE_TIMEOUT, errorCallback,
                   function success(data) {
                       var msgId = data[2];
                       if (msgId !== self.ANT_MESSAGE.channel_status.id) {
                           self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Expected channel status message response");
                           if (++retryNr < ANT.prototype.ANT_DEFAULT_RETRY) {
                               self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Trying once more to read channel status response " + retryNr);
                               retry();
                           }
                           else
                               if (typeof successCallback === "function") // Be flexible and proceed for waiting callbacks
                                   successCallback(data);
                               else
                                   self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Found no success callback");
                       }
                       else {

                           self.parseChannelStatus(data);

                           if (typeof successCallback === "function")
                               successCallback(data);
                           else
                               self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Found no success callback");
                       }
                   });
            }

            retry();
        });
};

// Called on first receive of broadcast from device/master
ANT.prototype.getUpdatedChannelID = function (channelNr, errorCallback, successCallback) {
    var msgId, self = this;

    self.sendOnly(self.request(channelNr, self.ANT_MESSAGE.set_channel_id.id),
        ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
        //function validation(data) { msgId = data[2]; return (msgId === ANT_MESSAGE.set_channel_id.id); },
        function error(err) {
            if (typeof errorCallback === "function")
                errorCallback(err);
            else
                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Found no error callback");
        },
        function success() {
            self.read(ANT.prototype.ANT_DEVICE_TIMEOUT, errorCallback,
               function success(data) {
                   var msgId = data[2];
                   if (msgId !== ANT.prototype.ANT_MESSAGE.set_channel_id.id)
                       self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Expected set channel id message response");
                   self.parse_response(data);
                   if (typeof successCallback === "function")
                       successCallback(data);
                   else
                       self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Found no success callback");
               });
        });
};

// p. 89 ANT Message Protocol and Usage, Rv 5.0b
// NVM not implemented
ANT.prototype.request = function (channelNr, msgID) {
    var channelNumber = channelNr || 0;

    return this.create_message(this.ANT_MESSAGE.request, new Buffer([channelNumber, msgID]));
};

ANT.prototype.isStartupNotification = function (data) {
    var msgId = data[2];
    return (msgId === this.ANT_MESSAGE.startup.id);
};

ANT.prototype.resetSystem = function (errorCallback, successCallback) {

    var reset_system_msg = this.create_message(this.ANT_MESSAGE.reset_system, new Buffer([0])),
        self = this;
    self.sendOnly(reset_system_msg,
        ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
           // function validation(data) { return self.isStartupNotification(data); },
            function error() { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not reset device, try to reinsert USB stick to clean up buffers and drivers."); errorCallback(); },
            function success() {
                self.read(ANT.prototype.ANT_DEVICE_TIMEOUT, errorCallback,
                    function success(data) {
                        if (!self.isStartupNotification(data))
                            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Expected a startup notification after RESET command");
                        self.parse_response(data);
                        //console.log("Reset system OK");
                        successCallback();
                    });
                // setTimeout(function () { successCallback() }, 500);

            });
};

ANT.prototype.releaseInterfaceCloseDevice = function () {
    var self = this;

    self.antInterface.release(function (error) {
        if (error) self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Problem with release of interface: "+ error);
        else {
            //console.log("Closing device, removing interface, exiting...");
            self.device.close();
            process.exit();
        }
    });
};

// Iterates from channelNrSeed and optionally closes channel
 ANT.prototype.iterateChannelStatus = function (channelNrSeed, closeChannel, iterationFinishedCB) {
     var self = this;

     self.getChannelStatus(channelNrSeed, function error() {
         self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not retrive channel status");
     },
         function success() {

             //if (self.channelConfiguration[channelNrSeed].channelStatus.channelState === ANT.prototype.CHANNEL_STATUS.SEARCHING ||
             //    self.channelConfiguration[channelNrSeed].channelStatus.channelState === ANT.prototype.CHANNEL_STATUS.TRACKING)
             //    console.log(self.channelConfiguration[channelNrSeed].channelStatus.toString());

             function reIterate() {
                 ++channelNrSeed;
                 if (channelNrSeed < self.capabilities.MAX_CHAN)
                     self.iterateChannelStatus(channelNrSeed, closeChannel, iterationFinishedCB);
                 else {
                     if (typeof iterationFinishedCB === "function")
                         iterationFinishedCB();
                     else
                         self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No iteration on channel status callback specified");
                 }
             }

             if (closeChannel && (self.channelConfiguration[channelNrSeed].channelStatus.channelState === ANT.prototype.CHANNEL_STATUS.SEARCHING ||
                    self.channelConfiguration[channelNrSeed].channelStatus.channelState === ANT.prototype.CHANNEL_STATUS.TRACKING))
                         self.close(channelNrSeed, function error(err) {
                             self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not close channel "+ err);
                         },
                             function success() {
                                 self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Channel " + channelNrSeed + " CLOSED.");
                                 reIterate();
                             });
             else
                 reIterate();
         });

 };

ANT.prototype.exit = function () {
    var self = this, channelNr;

    if (self.inTransfer) {
        //console.log("Canceling transfer on in endpoint");
        self.inTransfer.cancel(); // Trigger transferCancelCB
    }

    // Empty buffers please

    // self.tryCleaningBuffers(function () {

    if (self.outTransfer) {
        // console.log("Canceling transfer on out endpoint");
        self.outTransfer.cancel();
    }

    // });
};

ANT.prototype.read = function (timeout, errorCallback, successCallback) {
    var self = this;
    var channelNr;
    // var inTransfer;

    self.device.timeout = timeout; 

    //function retry() {try

    self.inTransfer = self.inEP.transfer(ANT.prototype.DEFAULT_ENDPOINT_PACKET_SIZE, function (error, data) {
        if (error) {
           // console.log("READ ERROR",error);
            errorCallback(error);
        }
            //console.log(Date.now() + "Receive: ", error);
            ////console.log(usb);
            //if (error.errno !== usb.LIBUSB_TRANSFER_CANCELLED) // May be aborted by pressing Ctrl-C in Node.js
            //    process.nextTick(retry); // Recursion
            ////retry();
        else
            successCallback(data);
        //else {
        //    //console.log(Date.now()+ "Received ");
        //    //console.log(data);
        //    parse_response.call(self, data);
        //    process.nextTick(retry);
        //    //retry();
        //}
    });
    //}

    //retry();
};

// Noticed that in endpoint buffers are not cleared sometimes when stopping application using Ctrl-C -> process SIGINT -> exit
// Max. buffer size = 64 on in endpoint
ANT.prototype.tryCleaningBuffers = function (callback) {
    var self = this;
    var retries = 0, bytes = 0;
    //console.log(self.device);

    self.device.timeout = ANT.prototype.ANT_DEVICE_TIMEOUT;

    function retry() {
        self.inEP.transfer(ANT.prototype.DEFAULT_ENDPOINT_PACKET_SIZE, function inTransferCallback(error, data) {
            if (error) {
                if (error.errno !== usb.LIBUSB_TRANSFER_TIMED_OUT) {
                    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Error:"+ error);
                    retries++;
                    retry();
                    //process.nextTick(retry());
                    //process.nextTick.call(self, self.tryCleaningBuffers);
                }
                else {
                    if (bytes > 0)
                        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Discarded "+bytes+" bytes from libusb buffers on in endpoint.");
                    callback(); // No more data, timeout
                }
            }
            else {
                //console.log("Discarding buffer data:", data, data.length)
                bytes += data.length;
                retries++;
                retry();
                //process.nextTick(retry());
            }
        });
    }

    retry();

};

ANT.prototype.init = function (errorCallback, callback) {
    var self = this,
        outTransferType,
        inTransferType;
    
    //  usb.setDebugLevel(3);


    //var idVendor = 4047, idProduct = 4104; // Garmin USB2 Wireless ANT+

    self.device = usb.findByIds(self.idVendor, self.idProduct);

    if (typeof self.device === "undefined") {
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not find USB ANT device vendor id:" + self.idVendor + " product id.:" + self.idProduct);
        errorCallback();
    } else {
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "USB ANT device found vendor 0x"+self.idVendor.toString(16)+"/"+self.idVendor+" product 0x"+self.idProduct.toString(16)+"/"+self.idProduct+ " on bus " + self.device.busNumber + " address " + self.device.deviceAddress);
        
        //+ ", max packet size endpoint 0/control: " + self.device.deviceDescriptor.bMaxPacketSize0 + " bytes, default transfer timeout ms.: " + self.device.timeout + ", packet size endpoints in/out 64 bytes");

        //console.log("Opening interface on device GARMIN USB2 ANT+ wireless/nRF24AP2 (Dynastream Innovations Inc.)");
        //console.log("Vendor id: " + self.idVendor + " Product id: " + self.idProduct);

        self.device.open(); // Init/get interfaces of device
        //console.log("Default timeout for native libusb transfer is :" + ant.timeout);

        self.antInterface = self.device.interface();
        if (typeof self.antInterface === "undefined") {
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not get interface to ant device, aborting");
            errorCallback();
        }
        //else {
            //   console.log("Found default interface, it has " + self.antInterface.endpoints.length + " endpoints ");
        //}

        if (self.antInterface.endpoints.length < 2) {
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Normal operation require 2 endpoints for in/out communication with ANT device");
            errorCallback();
        }

        // http://www.beyondlogic.org/usbnutshell/usb5.shtml
        self.inEP = self.antInterface.endpoints[0]; // Control endpoint
        if (self.inEP.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK)
            inTransferType = "BULK (" + self.inEP.transferType + ')';

        self.outEP = this.antInterface.endpoints[1];
        if (self.outEP.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK)
            outTransferType = "BULK (" + self.outEP.transferType + ')';

        // Shared endpoint number in/control and out
        // console.log("Number for endpoint: " + (self.inEP.address & 0xF) + " Control/in " + inTransferType + " - " + (self.outEP.address & 0xF) + " " + self.outEP.direction + " " + outTransferType);

        // console.log("Claiming interface");
        self.antInterface.claim(); // Must call before attempting transfer on endpoints

        //self.listen();

        //  console.log("Cleaning LIBUSB in endpoint buffers....");

        self.tryCleaningBuffers(
            function () {
                self.resetSystem(errorCallback, function _getCapabilities() {
                    // Allow 500 ms after reset before continuing to allow for "post-reset-state"
                    setTimeout(function infoRequest() {

                        self.getCapabilities(function _getANTVersion() {
                            self.getANTVersion(function _getDeviceSerialNumber() {
                                self.getDeviceSerialNumber(callback);
                            });
                        });
                    }, 500);

                });
            });


       
        //});
        //});
        // Setup in endpoint event listeners

        //inEP.addListener('data', function (data) {
        //    var timestamp = Date.now();
        //    console.log(timestamp);
        //    parse_response(data);
        //});

        //inEP.addListener('error', function (error) {
        //    console.error("inEndpoint error "+error);
        //});

        //inEP.addListener('end', function (error) {
        //    console.log("In endpoint received END event"); // stopStream must be called before
        //});

        //console.log("Starting instream with max packet size: "+ant.deviceDescriptor.bMaxPacketSize0);
        //inEP.startStream(5, ant.deviceDescriptor.bMaxPacketSize0/2);

        ////// Setup out endpoint event listeners

        //outEP.addListener('drain', function (data) {
        //    console.log(Date.now()+" Drain");
        //});

        //outEP.addListener('error', function (error) {
        //    console.error("outEndpoint error " + error);
        //});

        //outEP.addListener('end', function (error) {
        //    console.log("Out endpoint received END event"); // stopStream must be called before
        //});

        //console.log("Starting outstream...");
        //outEP.startStream(5, ant.deviceDescriptor.bMaxPacketSize0 / 2);
    }
};

// Associates a channel with a channel configuration
ANT.prototype.setChannelConfiguration = function (channelConfNr, channel) {
    var self = this;
    //console.trace();

   // console.log(Date.now() + "Configuration nr. ", channelConfNr, "of channel nr ", channel.number);

    //console.log("CHANNEL_CONFIGURATION", self.channelConfiguration.length);

    if (typeof self.channelConfiguration === "undefined") {
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No channel configuration object available to attach channel to. getCapabilities should be run beforehand to get max. available channels for device");
        return;
    }

    self.channelConfiguration[channelConfNr] = channel;
},

// Configures a channel
ANT.prototype.activateChannelConfiguration = function (channelConfNr, errorCallback, successCallback) {
    var self = this;
    var channel = self.channelConfiguration[channelConfNr];

    var continueConfiguration = function () {

        self.setChannelSearchTimeout(channelConfNr,
               function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not channel searchtimeout " + channel); errorCallback(err); },
                function (data) {
                    //console.log(Date.now() + " Set channel search timeout OK");

                    self.setChannelRFFrequency(channelConfNr,
                           function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not set RF frequency " + channel); errorCallback(err); },
                            function (data) {
                                // console.log(Date.now() + " Set channel RF frequency OK");
                                if (typeof channel.searchWaveform !== "undefined") {
                                    self.setSearchWaveform(channelConfNr,
                                       function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not channel search waveform " + channel); errorCallback(err); },
                                       function (data) {
                                           // console.log(Date.now() + " Set channel search waveform OK");
                                           successCallback();
                                       });
                                } else
                                    successCallback();
                            });
                });
    };

    //console.log("Configuring : ", channelConfNr);

    
    self.setNetworkKey(channelConfNr,
                               function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Failed to set network key." + channel.network); errorCallback(err); },
                               function (data) {
                                   // console.log("Set network key OK ");
                 self.assignChannel(channelConfNr,
                     function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not assign channel "+channel); errorCallback(err); },
                     function (data) {
                       
                         //console.log(Date.now() + " Assign channel OK");
                         self.setChannelId(channelConfNr,
                             function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not set channel id "+ channel); errorCallback(err); },
                              function (data) {
                                  //console.log(Date.now() + " Set channel id OK ");
                                  self.setChannelPeriod(channelConfNr,
                                     function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not set period "+ channel); errorCallback(err); },
                                      function (data) {
                                          //console.log(Date.now() + " Set channel period OK ");
                                          if (typeof channel.lowPrioritySearchTimeout !== "undefined")
                                              self.setLowPriorityChannelSearchTimeout(channelConfNr,
                                                  function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, " Could not set low priority search timeout" + channel); errorCallback(err); },
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

ANT.prototype.LIB_CONFIG = {
    DISABLED: 0x00,
    ENABLE_RX_TIMESTAMP: 0x20, // Bit 6
    ENABLE_RSSI: 0x40, // Bit 7 
    ENABLE_CHANNEL_ID: 0x80 // Bit 8
}

// Spec p. 75 "If supported, when this setting is enabled ANT will include the channel ID, RSSI, or timestamp data with the messages"
// 0 - Disabled, 0x20 = Enable RX timestamp output, 0x40 - Enable RSSI output, 0x80 - Enabled Channel ID output
ANT.prototype.libConfig = function(ucLibConfig,errorCallback,successCallback)
{
    var self = this, filler = 0;

    //console.log("libConfig hex = ", Number(ucLibConfig).toString(16),"binary=",Number(ucLibConfig).toString(2));
    if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
        this.sendAndVerifyResponseNoError(this.create_message(this.ANT_MESSAGE.libConfig, new Buffer([filler, ucLibConfig])), self.ANT_MESSAGE.libConfig.id, errorCallback, successCallback);
    else if (typeof this.capabilities !== "undefined" && !this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Device does not support extended messages - tried to configure via LibConfig API call");
}

// Only enables Channel ID extension of messages
ANT.prototype.RxExtMesgsEnable = function (ucEnable, errorCallback, successCallback) {
    var self = this, filler = 0;

    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Instead of using this API call libConfig can be used");

    if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
        this.sendAndVerifyResponseNoError(this.create_message(this.ANT_MESSAGE.RxExtMesgsEnable, new Buffer([filler, ucEnable])), self.ANT_MESSAGE.RxExtMesgsEnable.id, errorCallback, successCallback);
    else if (typeof this.capabilities !== "undefined" && !this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Device does not support extended messages - tried to configure via RxExtMesgsEnable API call");
}

// Spec. p. 77 "This functionality is primarily for determining precedence with multiple search channels that cannot co-exists (Search channels with different networks or RF frequency settings)"
// This is the case for ANT-FS and ANT+ device profile like i.e HRM
ANT.prototype.setChannelSearchPriority = function (ucChannelNum, ucSearchPriority, errorCallback, successCallback)
{
    var self = this;

    this.sendAndVerifyResponseNoError(this.create_message(this.ANT_MESSAGE.set_channel_search_priority, new Buffer([ucChannelNum, ucSearchPriority])), self.ANT_MESSAGE.set_channel_search_priority.id, errorCallback, successCallback);

}

ANT.prototype.setNetworkKey = function (channelConfNr, errorCallback, successCallback) {
    var self = this;
    var channel = this.channelConfiguration[channelConfNr];

    // console.log("Setting network key on net " + channel.network.number + " key: " + channel.network.key +" channel "+channel.number);

    this.sendAndVerifyResponseNoError(this.create_message(this.ANT_MESSAGE.set_network_key, Buffer.concat([new Buffer([channel.network.number]), new Buffer(channel.network.key)])), self.ANT_MESSAGE.set_network_key.id, errorCallback, successCallback);
    
};

ANT.prototype.assignChannel = function (channelConfNr, errorCallback, successCallback) {

    var channel = this.channelConfiguration[channelConfNr], self = this;

    //console.log("Assign channel " + channel.number + " to channel type " + Channel.prototype.CHANNEL_TYPE[channel.channelType] + "(" +
    //    channel.channelType + ")" + " on network " + channel.network.number);

    // Assign channel command should be issued before any other channel configuration messages (p. 64 ANT Message Protocol And Usaga Rev 50) ->
    // also sets defaults values for RF, period, tx power, search timeout p.22
    if (typeof channel.extendedAssignment === "undefined") // i.e background scanning
        this.sendAndVerifyResponseNoError(this.create_message(ANT.prototype.ANT_MESSAGE.assign_channel, new Buffer([channel.number, channel.channelType, channel.network.number])), ANT.prototype.ANT_MESSAGE.assign_channel.id, errorCallback, successCallback);
    else if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_EXT_ASSIGN_ENABLED) {
        this.sendAndVerifyResponseNoError(this.create_message(ANT.prototype.ANT_MESSAGE.assign_channel, new Buffer([channel.number, channel.channelType, channel.network.number, channel.extendedAssignment])), ANT.prototype.ANT_MESSAGE.assign_channel.id, errorCallback, successCallback);
    } else if (typeof this.capabilities !== "undefined" && !this.capabilities.options.CAPABILITIES_EXT_ASSIGN_ENABLED)
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Device does not support extended assignment");
};

ANT.prototype.setChannelId = function (channelConfNr, errorCallback, successCallback) {

    //(false, 0, 0, 0, 0),  // Search, no pairing   
    //                        DEFAULT_RETRY, ANT_DEVICE_TIMEOUT,
    //                        function () { exit("Failed to set channel id.") },
    // ANTWARE II - log file   1061.985 { 798221031} Tx - [A4][05][51][00][00][00][78][00][88][00][00]

    var set_channel_id_msg, self = this;
    var channel = this.channelConfiguration[channelConfNr];
    //console.log("Setting channel id. - channel number " + channel.number + " device type " + channel.deviceType + " transmission type " + channel.transmissionType);

    var buf = new Buffer(5);
    buf[0] = channel.number;
    buf.writeUInt16LE(channel.channelID.deviceNumber, 1); // If slave 0 matches any device number / dev id.
    // Seems like its not used at least for slave?  buf[3] = channel.deviceType & 0x80; // If bit 7 = 1 -> master = request pairing, slave = find pairing transmitter -> (pairing bit)
    // Pairing bit-set in Channel object, if pairing requested deviceType = deviceType | 0x80;
    buf[3] = channel.channelID.deviceType;
    buf[4] = channel.channelID.transmissionType; // Can be set to zero (wildcard) on a slave device, spec. p. 18 ANT Message Protocol and Usage, rev 5.0

    set_channel_id_msg = this.create_message(this.ANT_MESSAGE.set_channel_id, buf);

    this.sendAndVerifyResponseNoError(set_channel_id_msg, self.ANT_MESSAGE.set_channel_id.id, errorCallback, successCallback);

};

ANT.prototype.setChannelPeriod = function (channelConfNr, errorCallback, successCallback) {

    var set_channel_period_msg, rate, self = this;
    var channel = this.channelConfiguration[channelConfNr];
   
    var msg = "";

    if (channel.isBackgroundSearchChannel())
        msg = "(Background search channel)"

    //console.log("Set channel period for channel " + channel.number + " to " + channel.periodFriendly + " value: " + channel.period);

    if (typeof channel.period !== "undefined") {
        var buf = new Buffer(3);
        buf[0] = channel.number;
        buf.writeUInt16LE(channel.period, 1);

        set_channel_period_msg = this.create_message(this.ANT_MESSAGE.set_channel_messaging_period, new Buffer(buf));

        this.sendAndVerifyResponseNoError(set_channel_period_msg, self.ANT_MESSAGE.set_channel_messaging_period.id, errorCallback, successCallback);
    } else {
        
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Channel period not specified for channel "+channel.number+" "+msg);
        successCallback(); // Continue with configuration

    }

};

// Low priority search mode
// Spec. p. 72 : "...a low priority search will not interrupt other open channels on the device while searching",
// "If the low priority search times out, the module will switch to high priority mode"
ANT.prototype.setLowPriorityChannelSearchTimeout = function (channelConfNr, errorCallback, successCallback) {

    // Timeout in sec. : ucSearchTimeout * 2.5 s, 255 = infinite, 0 = disable low priority search

    var channel_low_priority_search_timeout_msg, 
        self = this,
        channel = this.channelConfiguration[channelConfNr];

    if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED) {
        //channel.lowPrioritySearchTimeout = ucSearchTimeout;

        //console.log("Set channel low priority search timeout channel " + channel.number + " timeout " + channel.lowPrioritysearchTimeout);
        var buf = new Buffer([channel.number, channel.lowPrioritySearchTimeout]);

        channel_low_priority_search_timeout_msg = this.create_message(ANT.prototype.ANT_MESSAGE.set_low_priority_channel_search_timeout, buf);

        this.sendAndVerifyResponseNoError(channel_low_priority_search_timeout_msg, ANT.prototype.ANT_MESSAGE.set_low_priority_channel_search_timeout.id, errorCallback, successCallback);
    } else
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Device does not support setting low priority search");
};

// High priority search mode
ANT.prototype.setChannelSearchTimeout = function (channelConfNr, errorCallback, successCallback) {

    // Each count in ucSearchTimeout = 2.5 s, 255 = infinite, 0 = disable high priority search mode (default search timeout is 25 seconds)
    var channel_search_timeout_msg, self = this;
    var channel = this.channelConfiguration[channelConfNr];

    if (typeof channel.searchTimeout === "undefined") {
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No high priority search timeout specified for channel " + channel.number);
        successCallback();
    } else {
        //console.log("Set channel search timeout channel " + channel.number + " timeout " + channel.searchTimeout);
        var buf = new Buffer([channel.number, channel.searchTimeout]);

        channel_search_timeout_msg = this.create_message(this.ANT_MESSAGE.set_channel_search_timeout, buf);

        this.sendAndVerifyResponseNoError(channel_search_timeout_msg, self.ANT_MESSAGE.set_channel_search_timeout.id, errorCallback, successCallback);
    }

};

ANT.prototype.setChannelRFFrequency = function (channelConfNr, errorCallback, successCallback) {
    // ucRFFreq*1Mhz+2400 Mhz
    var RFFreq_msg, self = this;
    var channel = this.channelConfiguration[channelConfNr];

    // console.log("Set channel RF frequency channel " + channel.number + " frequency " + channel.RFfrequency);
    RFFreq_msg = this.create_message(this.ANT_MESSAGE.set_channel_RFFreq, new Buffer([channel.number, channel.RFfrequency]));
    this.sendAndVerifyResponseNoError(RFFreq_msg, self.ANT_MESSAGE.set_channel_RFFreq.id, errorCallback, successCallback);
    
};

ANT.prototype.setSearchWaveform = function (channelConfNr, errorCallback, successCallback) {
    // waveform in little endian!

    var set_search_waveform_msg, self = this,
        buf = new Buffer(3);
    var channel = this.channelConfiguration[channelConfNr];

    if (typeof channel.searchWaveform === "undefined") {
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No search waveform specified");
        errorCallback();
    }

    //console.log("Set channel search waveform channel " + channel.number + " waveform " + channel.searchWaveform);

    buf[0] = channel.number;
    buf[1] = channel.searchWaveform[0];
    buf[2] = channel.searchWaveform[1];
    set_search_waveform_msg = this.create_message(this.ANT_MESSAGE.set_search_waveform, new Buffer(buf));

    this.sendAndVerifyResponseNoError(set_search_waveform_msg, self.ANT_MESSAGE.set_search_waveform.id, errorCallback, successCallback);
    
};

ANT.prototype.openRxScanMode = function (channelConfNr, errorCallback, successCallback, noVerifyResponseNoError) {
    var openRxScan_channel_msg, self = this;
    var channel = this.channelConfiguration[channelConfNr];
    //self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Opening channel " + channel.number);
    openRxScan_channel_msg = this.create_message(this.ANT_MESSAGE.open_rx_scan_mode, new Buffer([0]));

    this.sendAndVerifyResponseNoError(openRxScan_channel_msg, self.ANT_MESSAGE.open_rx_scan_mode.id, errorCallback, successCallback, noVerifyResponseNoError);
},

ANT.prototype.open = function (channelConfNr, errorCallback, successCallback, noVerifyResponseNoError) {
    //console.log("Opening channel "+ucChannel);
    var open_channel_msg, self = this;
    var channel = this.channelConfiguration[channelConfNr];
    //self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Opening channel " + channel.number);
    open_channel_msg = this.create_message(this.ANT_MESSAGE.open_channel, new Buffer([channel.number]));

    this.sendAndVerifyResponseNoError(open_channel_msg, self.ANT_MESSAGE.open_channel.id, errorCallback, successCallback,noVerifyResponseNoError);
};

// Closing first gives a response no error, then an event channel closed
ANT.prototype.close = function (channelConfNr, errorCallback, successCallback, noVerifyResponseNoError) {
    //console.log("Closing channel "+ucChannel);
    var close_channel_msg, self = this;
    var channel = this.channelConfiguration[channelConfNr];
    //console.log("Closing channel " + channel.number);
    close_channel_msg = this.create_message(this.ANT_MESSAGE.close_channel, new Buffer([channel.number]));

    this.sendOnly(close_channel_msg, ANT.prototype.ANT_DEFAULT_RETRY, 500, errorCallback,
        function success() {
            var retryNr = 0;

            function retryEventChannelClosed() {

                self.read(500, errorCallback,
                    function success(data) {
                        retryNr = 0;

                        if (!self.isEvent(ANT.prototype.RESPONSE_EVENT_CODES.EVENT_CHANNEL_CLOSED, data)) {
                            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Expected event CHANNEL_CLOSED");
                            retryNr++;
                            if (retryNr < ANT.prototype.ANT_RETRY_ON_CLOSE) {
                                self.emit(ANT.prototype.EVENT.LOG_MESSAGE,"Discarding "+data.inspect()+" from ANT engine packet queue. Retrying to get EVENT CHANNEL CLOSED from ANT device");
                                retryEventChannelClosed();
                            }
                            else {
                                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Reached maximum number of retries. Aborting.");
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
                                 if (!self.isResponseNoError(data, self.ANT_MESSAGE.close_channel.id)) {
                                     self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Expected response NO ERROR for close channel");
                                     retryNr++;
                                     if (retryNr < ANT.prototype.ANT_RETRY_ON_CLOSE) {
                                         self.emit(ANT.prototype.EVENT.LOG_MESSAGE, " Discarding "+data.inspect()+" from ANT engine packet queue. Retrying to get NO ERROR response from ANT device");
                                         retryResponseNoError();
                                     }
                                     else {
                                         self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Reached maximum number of retries. Aborting.");
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
ANT.prototype.isEvent = function (code, data) {
    var msgId = data[2], channelNr = data[3], eventOrResponse = data[4], eventCode = data[5], EVENT = 1;

    return (msgId === ANT.prototype.ANT_MESSAGE.channel_response.id && eventOrResponse === EVENT && code === eventCode);
};

// Check if channel response is a no error for a specific requested message id
ANT.prototype.isResponseNoError = function (data, requestedMsgId) {
    var msgId = data[2], msgRequested = data[4], msgCode = data[5];

    //console.log(Date.now() + " Validation");
    //console.log(data, requestedMsgId);

    return (msgId === ANT.prototype.ANT_MESSAGE.channel_response.id && msgCode === ANT.prototype.RESPONSE_EVENT_CODES.RESPONSE_NO_ERROR && msgRequested === requestedMsgId);

};

ANT.prototype.sendAndVerifyResponseNoError = function (message, msgId, errorCB, successCB,noVerification) {
    var self = this;
    this.sendOnly(message, ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT, errorCB,
    function success() {
       
        //if (typeof noVerification === "undefined") {
        //    self.read(ANT.prototype.ANT_DEVICE_TIMEOUT, errorCB,
        //         function success(data) {
        //             if (!self.isResponseNoError(data, msgId))
        //                 self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Expected response NO ERROR"); // No retry
        //             self.parse_response(data);
        //             successCB();
        //         });
        //} else
        successCB(); // Skip verification, will allow prototype.listen func. to continue parsing channel data without cancelling
        // Drawback : will buffer unread RESPONSE_NO_ERROR -> can get multiple packets when starting listen after activateConfiguration...
    }
    );

};

// p. 96 ANT Message protocol and usave rev. 5.0
// TRANSFER_TX_COMPLETED channel event if successfull, or TX_TRANSFER_FAILED -> msg. failed to reach master or response from master failed to reach the slave -> slave may retry
// 3rd option : GO_TO_SEARCH is received if channel is droppped -> channel should be unassigned
ANT.prototype.sendAcknowledgedData = function (ucChannel, pucBroadcastData, errorCallback, successCallback) {
    var buf = Buffer.concat([new Buffer([ucChannel]), pucBroadcastData.buffer]), self = this,
        ack_msg = self.create_message(ANT.prototype.ANT_MESSAGE.acknowledged_data, buf),
        resendMsg;

    // Add to retry queue -> will only be of length === 1
    resendMsg = {
        message: ack_msg,
        timeoutRetry: 0,
        retry: 0,
        EVENT_TRANSFER_TX_COMPLETED_CB: successCallback,
        EVENT_TRANSFER_TX_FAILED_CB: errorCallback,

        timestamp: Date.now()
    };

    this.retryQueue[ucChannel].push(resendMsg);


    //console.log(Date.now() + " SETTING TIMEOUT ");

    //resendMsg.timeoutCB = function () {
    //    //console.log(Date.now() + "TIMEOUT HANDLER FOR EVENT_TRANSFER_TX_COMPLETED/FAILED - NOT IMPLEMENTED");
    //    resendMsg.timeoutRetry++;
    //    if (resendMsg.timeoutRetry <= ANT.prototype.TX_DEFAULT_RETRY)
    //        send();
    //    else
    //        console.log(Date.now() + " Reached maxium number of timeout retries");
    //};


    resendMsg.retryCB = function send() {

        if (resendMsg.timeoutID)  // If we already have a timeout running, reset
            clearTimeout(resendMsg.timeoutID);

        resendMsg.timeoutID = setTimeout(resendMsg.retryCB, 2000);
        resendMsg.retry++;

        if (resendMsg.retry <= ANT.prototype.TX_DEFAULT_RETRY) {
            resendMsg.lastRetryTimestamp = Date.now();
            // Two-levels of transfer : 1. from app. to ANT via libusb and 2. over RF 
            self.sendOnly(ack_msg, ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
                function error(err) {
                    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Failed to send acknowledged data packet to ANT engine, due to problems with libusb <-> device"+ err);
                    if (typeof errorCallback === "function")
                        errorCallback(error);
                    else
                        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No transfer failed callback specified");
                },
                function success() { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, " Sent acknowledged message to ANT engine "+ ack_msg.friendly+" "+ pucBroadcastData.friendly); });
        } else {
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Reached maxium number of retries of "+ resendMsg.message.friendly);
            if (typeof resendMsg.EVENT_TRANSFER_TX_FAILED_CB === "function")
                resendMsg.EVENT_TRANSFER_TX_FAILED_CB();
            else
                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No EVENT_TRANSFER_TX_FAILED callback specified");
        }
    };

    resendMsg.retryCB();

};

// Send an individual packet as part of a bulk transfer
ANT.prototype.sendBurstTransferPacket = function (ucChannelSeq, packet, errorCallback, successCallback) {

    var buf, burst_msg, self = this;

    buf = Buffer.concat([new Buffer([ucChannelSeq]), packet]);

    burst_msg = self.create_message(ANT.prototype.ANT_MESSAGE.burst_transfer_data, buf);

    // Thought : what about transfer rate here? Maybe add timeout if there is a problem will burst buffer overload for the ANT engine
    // We will get a EVENT_TRANFER_TX_START when the actual transfer over RF starts
    // p. 102 ANT Message Protocol and Usage rev 5.0 - "it is possible to 'prime' the ANT buffers with 2 (or 8, depending on ANT device) burst packet prior to the next channel period."
    // "its important that the Host/ANT interface can sustain the maximum 20kbps rate"

    self.sendOnly(burst_msg, ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT, errorCallback, successCallback);
};

// p. 98 in spec.
// Sends bulk data
ANT.prototype.sendBurstTransfer = function (ucChannel, pucData, errorCallback, successCallback, messageFriendlyName) {
    var numberOfPackets = Math.ceil(pucData.length / 8),
        packetNr,
        lastPacket = numberOfPackets - 1,
        sequenceNr,
        channelNrField,
        packet,
        self = this,
        burstMsg;

    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Burst transfer of "+numberOfPackets+" packets (8-byte) on channel "+ucChannel+", length of payload is "+pucData.length+" bytes");

    // Add to retry queue -> will only be of length === 1
    burstMsg = {
        message: {
            buffer: pucData,
            friendlyName: messageFriendlyName
        },

        retry: 0,
        EVENT_TRANSFER_TX_COMPLETED_CB: successCallback,
        EVENT_TRANSFER_TX_FAILED_CB: errorCallback,
        timestamp: Date.now(),

    };

    //console.log(Date.now(), burstMsg);

    this.burstQueue[ucChannel].push(burstMsg);

    var error = function (err) {
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, " Failed to send burst transfer to ANT engine"+ err);
    };

    var success = function () {
        //console.log(Date.now()+ " Sent burst packet to ANT engine for transmission");
    };

    function sendBurst() {

        if (burstMsg.retry <= ANT.prototype.TX_DEFAULT_RETRY) {
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
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Reached maximum number of retries of entire burst of "+ burstMsg.message.friendlyName);
            if (typeof burstMsg.EVENT_TRANSFER_TX_FAILED_CB === "function")
                burstMsg.EVENT_TRANSFER_TX_FAILED_CB();
            else
                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No EVENT_TRANSFER_TX_FAILED callback specified");
        }
    }

    burstMsg.retryCB = function retry() { sendBurst(); };

    sendBurst();
};

//ANT.prototype.send = function (message, maxRetries, timeout, validationCallback, errorCallback, successCallback, skipReceive) {

//    var maxReceiveErrorRetries = maxRetries,
//        maxSendRetries = maxRetries,
//        startTimestamp = Date.now(),
//        self = this;

//    //console.trace();

//    this.device.timeout = timeout;

//    function retry() {

//        if (maxSendRetries === 0) {
//            console.log("Calling error callback - too many send retries");
//            errorCallback();
//        }

//        function receive() {
//            if (maxReceiveErrorRetries === 0) {
//                console.log("Calling error callback - too many receive retries");
//                errorCallback();
//            }

//            self.inTransfer = self.inEP.transfer(ANT.prototype.DEFAULT_ENDPOINT_PACKET_SIZE, function inTransferCallback(error, data) {
//                if (error) {
//                    console.log(Date.now() + " Receive (after send): " + error + ", retrying...");
//                    --maxReceiveErrorRetries;
//                    receive(); // Just retry receive
//                }
//                else {

//                    if (!validationCallback(data, message.id)) {
//                        // console.log("Expected startup notification after reset command, but got " + RESPONSE_EVENT_CODES[data[2]] + ", retrying...");
//                        //--maxReceiveErrorRetries;
//                        console.log(Date.now() + " Waiting on response for " + ANT.prototype.ANT_MESSAGE[message.id] + ", skipping this message; ", data);
//                        //console.log(self);
//                        self.parse_response(data);
//                        if (Date.now() - startTimestamp > 10000) {
//                            console.log("Validation timeout");
//                            errorCallback();
//                        }
//                        else
//                            receive();
//                    } else {
//                        console.log(Date.now() + " (post-validation) Received: ", data);
//                        successCallback(data);
//                    }
//                }

//            });
//        }

//        console.log(Date.now() + " Sending:" + message.friendly + " timeout " + timeout + " max retries " + maxRetries + " skip receive : ", skipReceive ? "yes " : "no ", message.buffer);

//        // console.log("Transfering " + message.friendly);
//        //console.log("THIS", this);
//        self.outTransfer = self.outEP.transfer(message.buffer, function outTransferCallback(error) {
//            if (error) {
//                console.log(Date.now() + "Send: " + error + ", retrying...");
//                retry(--maxSendRetries);
//            }
//            else if (typeof skipReceive === "undefined" || !skipReceive)
//                receive();
//            else
//                successCallback(undefined);
//        });
//    }

//    retry(maxSendRetries);
//};

ANT.prototype.sendOnly = function (message, maxRetries, timeout, errorCallback, successCallback) {
    var self = this,
        msg = "", request = "";

    // console.log(message.id, ANT.prototype.ANT_MESSAGE.request);
    if (message.id === ANT.prototype.ANT_MESSAGE.request.id)
        request = ANT.prototype.ANT_MESSAGE[message.buffer[4]];

    // console.log(Date.now() + " TX: ", message.buffer, " "+message.friendly + " "+request +" timeout " + timeout + " max retries " + maxRetries);

    if (typeof successCallback === "undefined")
        console.trace();

    this.device.timeout = timeout;

    function retry(retryNr) {

        self.outTransfer = self.outEP.transfer(message.buffer, function outTransferCallback(error) {
            if (error) { // LIBUSB errors
                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, " Send error: "+ error+ ", retrying...");
                retryNr -= 1;
                if (retryNr > 0)
                    retry(retryNr);
                else {
                    if (typeof errorCallback === "function")
                        errorCallback(error);
                    else {
                        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Error callback is not a function. Reached maximum retries during send.");
                        console.trace();
                    }
                }
            }
            else {
                if (typeof successCallback === "function")
                    successCallback();
                else {
                    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Success callback is not a function");
                    console.trace();
                }

            }
        });
    }

    retry(maxRetries);
};

module.exports = ANT;