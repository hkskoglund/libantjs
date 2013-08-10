"use strict";

var events = require('events'),
   // usb = require('usb'),
   USBNode = require('./USBNode.js'),
    util = require('util'),
    Channel = require('./channel.js'),
    ANTMessage = require('./messages/ANTMessage.js'),
    Duplex = require('stream').Duplex,

    // Notifications from ANT

    NotificationStartup = require('./messages/NotificationStartup.js'),
    NotificationSerialError = require('./messages/NotificationSerialError.js'),

    // Control ANT
    ResetSystemMessage = require('./messages/ResetSystemMessage.js');
        
    

// Low level API/interface to ANT chip
function ANT() {
    events.EventEmitter.call(this);

    this.retryQueue = {}; // Queue of packets that are sent as acknowledged using the stop-and wait ARQ-paradigm, initialized when parsing capabilities (number of ANT channels of device) -> a retry queue for each channel
    this.burstQueue = {}; // Queue outgoing burst packets and optionally adds a parser to the burst response

    this.CHIPQueue = {}; // Queue of request sent directly to the ANT chip

    //console.log("ANT instance instance of EventEmitter",this instanceof events.EventEmitter );
}

// Let ANT inherit from EventEmitter http://nodejs.org/api/util.html#util_util_inherits_constructor_superconstructor
util.inherits(ANT, events.EventEmitter);

// Continous scanning channel or background scanning channel
ANT.prototype.SCANNING_CHANNEL_TYPE = {
    CONTINOUS: 0x00,
    BACKGROUND: 0x01
};

ANT.prototype.RESET_DELAY_TIMEOUT = 500; // Allow 500 ms after reset command before continuing with callbacks...


ANT.prototype.ANT_DEFAULT_RETRY = 2;

ANT.prototype.ANT_RETRY_ON_CLOSE = 10;  // Potentially get quite a lot of broadcasts in a ANT-FS channel

ANT.prototype.TX_DEFAULT_RETRY = 5; // Retry of RF acknowledged packets (including timeouts)

ANT.prototype.SEARCH_TIMEOUT = {
    INFINITE_SEARCH: 0xFF,
    DISABLE_HIGH_PRIORITY_SEARCH_MODE: 0x00
};

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

ANT.prototype.getDuplex = function () {
    return this._stream;
}
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




ANT.prototype.parseChannelResponse = function (data) {
    var channel = data[3],
        msgId = data[4],
        msgCode = data[5],
            msg;

    //console.log("CHANNEL RESPONSE RAW", data);
    if (msgId === 1) // Set to 1 for RF event
        msg = "EVENT on channel " + channel + " " + ANT.prototype.RESPONSE_EVENT_CODES[msgCode].friendly+" ";
    else
        msg = "RESPONSE on channel " + channel + " to msg. id 0x" + msgId.toString(16) + "  " + ANTMessage.prototype.MESSAGE[msgId] + " " + ANT.prototype.RESPONSE_EVENT_CODES[msgCode].friendly;

    
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
    };

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
    var ANTmsg = {
        SYNC:   data[0],
        length: data[1],
        id:     data[2]
    };

    //var ANTmsg = new ANTMessage();
    //ANTmsg.setMessage(data, true);
    //if (ANTmsg.message)
    //  this.emit(ANT.prototype.EVENT.LOG_MESSAGE, ANTmsg.message.text);

    var antInstance = this,
        self = this,
        firstSYNC = ANTmsg.SYNC,
        msgLength = ANTmsg.length,
       // msgID = ANTmsg.id,
        msgFlag, // Indicates if extended message info. is available and what info. to expect
        msgStr = "",
        msgCode,
        channelNr,
        channelID,
        sequenceNr,
        payloadData,
        resendMsg,
        burstMsg,
        burstParser,
        msgCRC = data[3 + ANTmsg.length];
    //    verifiedCRC = ANTmsg.getCRC(data),
    //    SYNCOK = (ANTmsg.SYNC === ANTMessage.prototype.SYNC),
    //    CRCOK = (msgCRC === verifiedCRC);

    //if (typeof msgCRC === "undefined")
    //    console.log("msgCRC undefined", "ANTmsg",ANTmsg, data);

    //// Check for valid SYNC byte at start

    //if (!SYNCOK) {
    //    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, " Invalid SYNC byte "+ firstSYNC+ " expected "+ ANTMessage.prototype.SYNC+" cannot trust the integrety of data, thus discarding bytes:"+ data.length);
    //    return;
    //}

    //// Check CRC

    //if (!CRCOK) {
    //    console.log("CRC failure - allow passthrough");
    //    //self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "CRC failure - verified CRC " + verifiedCRC.toString(16) + " message CRC" + msgCRC.toString(16));
    //    //return;
    //}

    switch (ANTmsg.id) {

        //// Data

        //case ANTMessage.prototype.MESSAGE.burst_transfer_data.id:
            
        //    ANTmsg.channel = data[3] & 0x1F; // 5 lower bits
        //    ANTmsg.sequenceNr = (data[3] & 0xE0) >> 5; // 3 upper bits

        //    if (ANTmsg.length >= 9) { // 1 byte for channel NR + 8 byte payload - standard message format

        //        msgStr += "BURST on CHANNEL " + ANTmsg.channel + " SEQUENCE NR " + ANTmsg.sequenceNr;
        //        if (ANTmsg.sequenceNr & 0x04) // last packet
        //            msgStr += " LAST";

        //        payloadData = data.slice(4, 12);

        //        // Assemble burst data packets on channelConfiguration for channel, assume sequence number are received in order ...

        //        // console.log(payloadData);

        //        if (ANTmsg.sequenceNr === 0x00) // First packet 
        //        {
        //            // console.time('burst');
        //            antInstance.channelConfiguration[ANTmsg.channel].startBurstTimestamp = Date.now();

        //            antInstance.channelConfiguration[ANTmsg.channel].burstData = payloadData; // Payload 8 bytes

        //            // Extended msg. only in the first packet
        //            if (ANTmsg.length > 9) {
        //                msgFlag = data[12];
        //                //console.log("Extended msg. flag : 0x"+msgFlag.toString(16));
        //                this.parse_extended_message(ANTmsg.channel, data);
        //            }
        //        }
        //        else if (ANTmsg.sequenceNr > 0x00)

        //            antInstance.channelConfiguration[ANTmsg.channel].burstData = Buffer.concat([antInstance.channelConfiguration[ANTmsg.channel].burstData, payloadData]);

        //        if (ANTmsg.sequenceNr & 0x04) // msb set === last packet 
        //        {
        //            //console.timeEnd('burst');
        //            antInstance.channelConfiguration[ANTmsg.channel].endBurstTimestamp = Date.now();

        //            var diff = antInstance.channelConfiguration[ANTmsg.channel].endBurstTimestamp - antInstance.channelConfiguration[ANTmsg.channel].startBurstTimestamp;

        //            // console.log("Burst time", diff, " bytes/sec", (antInstance.channelConfiguration[channelNr].burstData.length / (diff / 1000)).toFixed(1), "bytes:", antInstance.channelConfiguration[channelNr].burstData.length);

        //            burstMsg = antInstance.burstQueue[ANTmsg.channel][0];
        //            if (typeof burstMsg !== "undefined")
        //                burstParser = burstMsg.parser;

        //            if (!antInstance.channelConfiguration[ANTmsg.channel].emit(Channel.prototype.EVENT.BURST, ANTmsg.channel, antInstance.channelConfiguration[ANTmsg.channel].burstData, burstParser))
        //                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No listener for event Channel.prototype.EVENT.BURST on channel " + ANTmsg.channel);
        //            else
        //                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Burst data received " + antInstance.channelConfiguration[ANTmsg.channel].burstData.length + " bytes time " + diff + " ms rate " + (antInstance.channelConfiguration[ANTmsg.channel].burstData.length / (diff / 1000)).toFixed(1) + " bytes/sec");

        //            //antInstance.channelConfiguration[channelNr].parseBurstData(antInstance.channelConfiguration[channelNr].burstData, burstParser);
        //        }
        //    }
        //    else {
        //        console.trace();
        //        console.log("Data", data);
        //        antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Cannot handle this message of "+ANTmsg.length+ " bytes. Expecting a message length of 9 for standard messages or greater for extended messages (channel ID/RSSI/RX timestamp)");
        //    }

        //    break;

        //case ANTMessage.prototype.MESSAGE.broadcast_data.id:

        //    msgStr += ANTMessage.prototype.MESSAGE.broadcast_data.friendly + " ";

        //    channelNr = data[3];
        //    msgStr += " on channel " + channelNr;

        //    // Parse flagged extended message info. if neccessary
        //    if (ANTmsg.length > 9) {
        //        msgFlag = data[12];
        //        //console.log("Extended msg. flag : 0x"+msgFlag.toString(16));
        //        this.parse_extended_message(channelNr, data); // i.e channel ID
        //    }

        //    // Check for updated channel ID to the connected device (ONLY FOR IF CHANNEL ID IS NOT ENABLED IN EXTENDED PACKET INFO)

        //    if (typeof antInstance.channelConfiguration[channelNr].hasUpdatedChannelID === "undefined") {

        //        antInstance.getUpdatedChannelID(channelNr,
        //            function error() {
        //                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Failed to get updated channel ID");
        //            },
        //           function success(data) {
        //               antInstance.channelConfiguration[channelNr].hasUpdatedChannelID = true;
        //           });

        //    }

        //    // Call to broadcast handler for channel
        //    if (!antInstance.channelConfiguration[channelNr].emit(Channel.prototype.EVENT.BROADCAST, data))
        //        antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event Channel.prototype.EVENT.BROADCAST on channel "+channelNr);

        //    //antInstance.channelConfiguration[channelNr].broadCastDataParser(data);

        //    break;

            // Notifications from ANT engine

        case ANTMessage.prototype.MESSAGE.NOTIFICATION_STARTUP:

            //if (!antInstance.emit(antInstance.EVENT.STARTUP, data))
            //    antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.STARTUP");

            var notification = new NotificationStartup(data);
          
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, notification.toString());

            break;

        case ANTMessage.prototype.MESSAGE.NOTIFICATION_SERIAL_ERROR:

        //    if (!antInstance.emit(antInstance.EVENT.SERIAL_ERROR, data))
        //        antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.SERIAL_ERROR");

            var notification = new NotificationSerialError(data);
             
            if (!self.emit(ANT.prototype.EVENT.SERIAL_ERROR, notification.message.type + " " + notification.message.text))
                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, notification.message.type + " " + notification.message.text);

            break;

            // Channel event or responses

        case ANTMessage.prototype.MESSAGE.channel_response.id:

            var channelResponseMessage = antInstance.parseChannelResponse(data);

            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, channelResponseMessage);
            

            msgStr += ANTMessage.prototype.MESSAGE.channel_response.friendly + " " + channelResponseMessage;
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
                    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Re-sending ACKNOWLEDGE message due to TX_FAILED, retry "+resendMsg.retry);
                    resendMsg.retryCB();
                }

                if (antInstance.burstQueue[channelNr].length >= 1) {
                    burstMsg = antInstance.burstQueue[channelNr][0];
                    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Re-sending BURST message due to TX_FAILED "+burstMsg.message.friendlyName+" retry "+burstMsg.retry);
                    burstMsg.retryCB();
                }
            }

            // Call channel event/response-handler for each channel

           // OLD-way of calling callback antInstance.channelConfiguration[channelNr].channelResponseEvent(data);

           // console.log("Channel response/EVENT", channelNr, channelResponseMessage,antInstance.channelConfiguration[channelNr]);
            antInstance.channelConfiguration[channelNr].emit(Channel.prototype.EVENT.CHANNEL_RESPONSE_EVENT, data, channelResponseMessage);


            break;

            // Response messages to request 

            // Channel specific 

        case ANTMessage.prototype.MESSAGE.channel_status.id:
            if (!antInstance.emit(ANT.prototype.EVENT.CHANNEL_STATUS, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.CHANNEL_STATUS");

            break;

        case ANTMessage.prototype.MESSAGE.set_channel_id.id:
            if (!antInstance.emit(ANT.prototype.EVENT.SET_CHANNEL_ID, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No listener for event ANT.prototype.EVENT.SET_CHANNEL_ID");
            break;

            // ANT device specific, i.e nRF24AP2

        case ANTMessage.prototype.MESSAGE.ANT_version.id:
            if (!antInstance.emit(ANT.prototype.EVENT.ANT_VERSION, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.ANT_VERSION");
            break;

        case ANTMessage.prototype.MESSAGE.capabilities.id:

            if (!antInstance.emit(ANT.prototype.EVENT.CAPABILITIES, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.CAPABILITIES");

            break;

        case ANTMessage.prototype.MESSAGE.device_serial_number.id:
            if (!antInstance.emit(ANT.prototype.EVENT.DEVICE_SERIAL_NUMBER, data))
                antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE,"No listener for event ANT.prototype.EVENT.DEVICE_SERIAL_NUMBER");

            break;

        default:
            //msgStr += "* NO parser specified *";
            antInstance.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Unable to parse received data");
            break;
    }

    // There might be more buffered data messages from ANT engine available (if commands/request are sent, but not read in awhile)

    var nextExpectedSYNCIndex = 1 + ANTmsg.length + 2 + 1;
    if (data.length > nextExpectedSYNCIndex) {
       // console.log(data.slice(nextExpectedSYNCIndex));
        this.parse_response(data.slice(nextExpectedSYNCIndex));
    }

};

// Continuously listen on incoming packets from ANT engine and send it to the general parser for further processing
ANT.prototype.listen = function (transferCancelledCallback) {
   
    var self = this, NO_TIMEOUT = 0, TIMEOUT = 30000, msgLength, channelNr, msgCRC, verifiedCRC, SYNCOK,CRCOK;

    function retry() {
        var errorCB = function error(err) {

            if (err.errno === usb.LIBUSB_TRANSFER_TIMED_OUT) {
                self._stream.emit('error',"Timeout: No ANT data received in " + TIMEOUT + " ms.",err);
              
                process.nextTick(retry);
            }
            else if (err.errno === usb.LIBUSB_TRANSFER_CANCELLED) {
                //console.log(error);
                // Transfer cancelled, may be aborted by pressing Ctrl-C in Node.js 
                if (typeof transferCancelledCallback === "function") {
                    self._stream.emit('error', "Transfer cancelled",err);
                    //self.emit(ANT.prototype.EVENT.LOG_MESSAGE,"Calling cancellation callback "+transferCancelledCallback.name);
                    transferCancelledCallback();
                }
                else
                    self._stream.emit('error', "No transfer cancellation callback specified");

            } else {
                self._stream.emit('error', "Receive error in listen:" + err,err);
                process.nextTick(retry);
            }

        },

     successCB = function success(data) {
         self._stream.push(data);
         process.nextTick(retry);
     };

        self.receive(TIMEOUT, errorCB, successCB);
    }

    retry();

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

    self.sendOnly(self.request(undefined, ANTMessage.prototype.MESSAGE.capabilities.id),
        ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
       // function validation(data) { msgId = data[2]; return (msgId === ANTMessage.prototype.MESSAGE.capabilities.id); },
        function error() { self.emit(ANT.prototype.EVENT.LOG_MESSAGE,"Failed to get device capabilities."); completeCB(); },
        function success() {
            self.receive(ANT.prototype.ANT_DEVICE_TIMEOUT, completeCB,
                function success(data) {
                    var msgId = data[2];
                    if (msgId !== ANTMessage.prototype.MESSAGE.capabilities.id)
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

    self.sendOnly(self.request(undefined, ANTMessage.prototype.MESSAGE.ANT_version.id),
        ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
        //function validation(data) { msgId = data[2]; return (msgId === ANTMessage.prototype.MESSAGE.ANT_version.id); },
        function error() { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Failed to get ANT version."); callback(); },
        function success() {
            self.receive(ANT.prototype.ANT_DEVICE_TIMEOUT, callback,
               function success(data) {
                   var msgId = data[2];
                   if (msgId !== ANTMessage.prototype.MESSAGE.ANT_version.id)
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
        self.sendOnly(self.request(undefined, ANTMessage.prototype.MESSAGE.device_serial_number.id),
            ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
            //function validation(data) { msgId = data[2]; return (msgId === ANTMessage.prototype.MESSAGE.device_serial_number.id); },
            function error() { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Failed to get device serial number"); callback(); },
            function success() {
                self.receive(ANT.prototype.ANT_DEVICE_TIMEOUT, callback,
               function success(data) {
                   var msgId = data[2];
                   if (msgId !== ANTMessage.prototype.MESSAGE.device_serial_number.id)
                       self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Expected device serial number message response");

                   self.parse_response(data);
                   if (typeof callback === "function")
                       callback.call(self);
                   else
                       self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Found no callback after getDeviceSerialNumber");
               });
            });
    else
        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Device does not have a serial number");
};

ANT.prototype.getChannelStatus = function (channelNr, errorCallback, successCallback) {
    var msgId, self = this;

    self.sendOnly(self.request(channelNr, ANTMessage.prototype.MESSAGE.channel_status.id),
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
                self.receive(ANT.prototype.ANT_DEVICE_TIMEOUT, errorCallback,
                   function success(data) {
                       var msgId = data[2];
                       if (msgId !== ANTMessage.prototype.MESSAGE.channel_status.id) {
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

    self.sendOnly(self.request(channelNr, ANTMessage.prototype.MESSAGE.set_channel_id.id),
        ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
        //function validation(data) { msgId = data[2]; return (msgId === ANT_MESSAGE.set_channel_id.id); },
        function error(err) {
            if (typeof errorCallback === "function")
                errorCallback(err);
            else
                self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Found no error callback");
        },
        function success() {
            self.receive(ANT.prototype.ANT_DEVICE_TIMEOUT, errorCallback,
               function success(data) {
                   var msgId = data[2];
                   if (msgId !== ANTMessage.prototype.MESSAGE.set_channel_id.id)
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
    var channelNumber = channelNr || 0,
        requestMsg = new ANTMessage();

    return requestMsg.create_message(ANTMessage.prototype.MESSAGE.request, new Buffer([channelNumber, msgID]));
};

//ANT.prototype.isStartupNotification = function (data) {
//    var msgId = data[2];
//    return (msgId === ANTMessage.prototype.MESSAGE.startup.id);
//};


function resetANTreceiveStateMachine(callback)
{
// p.63 in spec; if a success/failure response is not received, the host should send ANT a series of 15 0' to reset ANT receive state machine
    var resetStateMachineMsgContent = new Buffer([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        msg = new ResetSystemMessage();
    msg.name = "Reset System - reset ANT receive state machine";
    msg.create(resetStateMachineMsgContent);

    //console.log("reset state machine", msg);

     this._stream.write(msg.getBuffer(), 'buffer', callback); 
}

ANT.prototype.resetSystem = function (successCallback) {

    this.usb.setDirectANTChipCommunicationTimeout();
    var msg = new ResetSystemMessage();
    console.log("RESET SYSTEM MSG:",msg);
    this._stream.write(msg.getBuffer(), 'buffer', this.receive(function _cb(data) {
        //console.log("HELLO",data,successCallback.toString());
        var cb = function () {
            setTimeout(function _resetDelayTimeout() { successCallback(data) }, ANT.prototype.RESET_DELAY_TIMEOUT);
        };

        if (typeof data === "undefined") // Probably work...?
            resetANTreceiveStateMachine.bind(this)(function () { this.receive(function (data) { cb(); }) }.bind(this));
        else
            cb();

       
    }.bind(this))); 
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

    ANT.prototype.exit = function (callback) {
      
        // Finish TX stream
        this._stream.end(null,null,function _streamTXFinishCallback() { this.usb.exit(callback); }.bind(this));
        // TO DO : Close RX stream

      

    };

    //// Noticed that in endpoint buffers are not cleared sometimes when stopping application using Ctrl-C -> process SIGINT -> exit
    //// Max. buffer size = 64 on in endpoint
    //ANT.prototype.tryCleaningBuffers = function (callback) {
    //    var self = this;
    //    var retries = 0, bytes = 0;
    //    //console.log(self.device);

    //    self.device.timeout = ANT.prototype.ANT_DEVICE_TIMEOUT;

    //    function retry() {
    //        self.inEP.transfer(ANT.prototype.DEFAULT_ENDPOINT_PACKET_SIZE, function inTransferCallback(error, data) {
    //            if (error) {
    //                if (error.errno !== usb.LIBUSB_TRANSFER_TIMED_OUT) {
    //                    self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Error:"+ error);
    //                    retries++;
    //                    retry();
    //                    //process.nextTick(retry());
    //                    //process.nextTick.call(self, self.tryCleaningBuffers);
    //                }
    //                else {
    //                    if (bytes > 0)
    //                        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Discarded "+bytes+" bytes from libusb buffers on in endpoint.");
    //                    callback(); // No more data, timeout
    //                }
    //            }
    //            else {
    //                //console.log("Discarding buffer data:", data, data.length)
    //                bytes += data.length;
    //                retries++;
    //                retry();
    //                //process.nextTick(retry());
    //            }
    //        });
    //    }

    //    retry();

    //};

    ANT.prototype.init = function (idVendor,idProduct, callback) {

        var vendor = idVendor || 4047,
            product =  idProduct || 4104;

        process.on('SIGINT', function sigint() {
            this.exit(function _exitCB() { console.log("USB ANT device closed"); });

        }.bind(this));

        this.usb = new USBNode();

        //console.log("Packet size", this.usb.getEndpointPacketSize());

        // https://github.com/joyent/node/blob/master/lib/_stream_duplex.js
        this._stream = new Duplex({ highWaterMark: this.usb.getEndpointPacketSize() });

        // Must be defined/overridden otherwise throws error "not implemented"
        // https://github.com/joyent/node/blob/master/lib/_stream_readable.js
        this._stream._read = function (size) {
            // console.trace();
            //console.log("Consumer wants to read %d bytes",size);
            // this.readable.push('A');
        }.bind(this);

        //this.readable.pipe(process.stdout);

        // http://nodejs.org/api/stream.html#stream_class_stream_readable
        // "If you just want to get all the data out of the stream as fast as possible, this is the best way to do so."
        // This is socalled "FLOW"-mode (no need to make a manual call to .read to get data from internal buffer)
        this._stream.addListener('data', function (ANTresponse) {
            console.log(Date.now(), 'Stream RX:', ANTresponse);
            this.parse_response(ANTresponse);
        }.bind(this));


        //this._stream.addListener('readable', function () {
        //    console.log("Duplex",arguments);
        //});

        this._stream.addListener('error', function (msg, err) {
            this.emit(ANT.prototype.EVENT.LOG_MESSAGE, msg);
            if (typeof err !== "undefined")
                this.emit(ANT.prototype.EVENT.LOG_MESSAGE, err);
        }.bind(this));

        this._stream.addListener('drain', function () { console.log(Date.now(), "Stream TX DRAIN"); });

        this._stream.addListener('finish', function () {

            console.log(Date.now(), "Stream TX FINISH", arguments);
            console.log(this._events);
           
        }.bind(this));

        // Callback from doWrite-func. in module _stream_writable (internal node.js)
        this._stream._write = function _write(ANTrequest, encoding, nextCB) {
            // console.trace();
            console.log(Date.now(), "Stream TX:", ANTrequest);
            this.send(ANTrequest,nextCB);
       
            //self._stream.end();
            //console.log("nextCB", nextCB.toString());
            // default passed by node
            // nextCB function (er) {
            //   onwrite(stream, er);
            //}
            //nextCB();
        }.bind(this);

        this.addListener(ANT.prototype.EVENT.LOG_MESSAGE, this.showLogMessage);

        //this.addListener(ANT.prototype.EVENT.STARTUP, this.parseNotificationStartup);
        //this.addListener(ANT.prototype.EVENT.SERIAL_ERROR, this.parseNotificationSerialError);
        this.addListener(ANT.prototype.EVENT.CHANNEL_STATUS, this.parseChannelStatus);
        this.addListener(ANT.prototype.EVENT.SET_CHANNEL_ID, this.parseChannelID);
        this.addListener(ANT.prototype.EVENT.DEVICE_SERIAL_NUMBER, this.parseDeviceSerialNumber);
        this.addListener(ANT.prototype.EVENT.ANT_VERSION, this.parseANTVersion);
        this.addListener(ANT.prototype.EVENT.CAPABILITIES, this.parseCapabilities);


    
        // console.log("Self.usb", self.usb);
        this.usb.init(vendor, product, function () {
            this.resetSystem(function () {
                console.log(Date.now(), "Reset system sent and response received", arguments);
                if (typeof callback === "function")
                    callback();
            });
        }.bind(this));
        //console.log("THIS IS", this);

        //self.tryCleaningBuffers(
        //    function () {
        //  self.resetSystem(function _getCapabilities() {
        //            // Allow 500 ms after reset before continuing to allow for "post-reset-state"
        //            setTimeout(function infoRequest() {

        //                self.getCapabilities(function _getANTVersion() {
        //                    self.getANTVersion(function _getDeviceSerialNumber() {
        //                        self.getDeviceSerialNumber(callback);
        //                    });
        //     });
        //            }, 500);

        //        });
        //    });




    };

    // Associates a channel with a channel configuration
    ANT.prototype.setChannelConfiguration = function (channel) {
        var self = this;
        //console.trace();

        //console.log(Date.now() + "Configuration of channel nr ", channel.number);

        if (typeof self.channelConfiguration === "undefined") {
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No channel configuration object available to attach channel to. getCapabilities should be run beforehand to get max. available channels for device");
            return;
        }

        self.channelConfiguration[channel.number] = channel;
        //console.log("CHANNEL CONFIGURATION",self.channelConfiguration);
    },

    // Configures a channel
    ANT.prototype.activateChannelConfiguration = function (desiredChannel, errorCallback, successCallback) {
        //console.log("DESIRED CHANNEL", desiredChannel);
        var self = this, channelNr = desiredChannel.number;
        var channel = self.channelConfiguration[channelNr];

        var continueConfiguration = function () {

            self.setChannelSearchTimeout(channelNr,
                   function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not channel searchtimeout " + channel); errorCallback(err); },
                    function (data) {
                        //console.log(Date.now() + " Set channel search timeout OK");

                        self.setChannelRFFrequency(channelNr,
                               function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not set RF frequency " + channel); errorCallback(err); },
                                function (data) {
                                    // console.log(Date.now() + " Set channel RF frequency OK");
                                    if (typeof channel.searchWaveform !== "undefined") {
                                        self.setSearchWaveform(channelNr,
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

        //console.log("Configuring : ", channelNr);

    
        self.setNetworkKey(channelNr,
                                   function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Failed to set network key." + channel.network); errorCallback(err); },
                                   function (data) {
                                       // console.log("Set network key OK ");
                                       self.assignChannel(channelNr,
                                           function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not assign channel "+channel); errorCallback(err); },
                                           function (data) {
                       
                                               //console.log(Date.now() + " Assign channel OK");
                                               self.setChannelId(channelNr,
                                                   function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not set channel id "+ channel); errorCallback(err); },
                                                    function (data) {
                                                        //console.log(Date.now() + " Set channel id OK ");
                                                        self.setChannelPeriod(channelNr,
                                                           function error(err) { self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Could not set period "+ channel); errorCallback(err); },
                                                            function (data) {
                                                                //console.log(Date.now() + " Set channel period OK ");
                                                                if (typeof channel.lowPrioritySearchTimeout !== "undefined")
                                                                    self.setLowPriorityChannelSearchTimeout(channelNr,
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
    };

    // Spec p. 75 "If supported, when this setting is enabled ANT will include the channel ID, RSSI, or timestamp data with the messages"
    // 0 - Disabled, 0x20 = Enable RX timestamp output, 0x40 - Enable RSSI output, 0x80 - Enabled Channel ID output
    ANT.prototype.libConfig = function (ucLibConfig, errorCallback, successCallback) {
        var self = this,
            filler = 0,
            libConfigMsg = new ANTMessage();

        //console.log("libConfig hex = ", Number(ucLibConfig).toString(16),"binary=",Number(ucLibConfig).toString(2));
        if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
            this.sendAndVerifyResponseNoError(libConfigMsg.create_message(ANTMessage.prototype.MESSAGE.libConfig, new Buffer([filler, ucLibConfig])), ANTMessage.prototype.MESSAGE.libConfig.id, errorCallback, successCallback);
        else if (typeof this.capabilities !== "undefined" && !this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Device does not support extended messages - tried to configure via LibConfig API call");
    };

    // Only enables Channel ID extension of messages
    ANT.prototype.RxExtMesgsEnable = function (ucEnable, errorCallback, successCallback) {
        var self = this, filler = 0, message = new ANTMessage();

        self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Instead of using this API call libConfig can be used");

        if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
            this.sendAndVerifyResponseNoError(message.create_message(ANTMessage.prototype.MESSAGE.RxExtMesgsEnable, new Buffer([filler, ucEnable])), ANTMessage.prototype.MESSAGE.RxExtMesgsEnable.id, errorCallback, successCallback);
        else if (typeof this.capabilities !== "undefined" && !this.capabilities.options.CAPABILITIES_EXT_MESSAGE_ENABLED)
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Device does not support extended messages - tried to configure via RxExtMesgsEnable API call");
    };

    // Spec. p. 77 "This functionality is primarily for determining precedence with multiple search channels that cannot co-exists (Search channels with different networks or RF frequency settings)"
    // This is the case for ANT-FS and ANT+ device profile like i.e HRM
    ANT.prototype.setChannelSearchPriority = function (ucChannelNum, ucSearchPriority, errorCallback, successCallback) {
        var self = this, message = new ANTMessage();

        this.sendAndVerifyResponseNoError(message.create_message(ANTMessage.prototype.MESSAGE.set_channel_search_priority, new Buffer([ucChannelNum, ucSearchPriority])), ANTMessage.prototype.MESSAGE.set_channel_search_priority.id, errorCallback, successCallback);

    };

    ANT.prototype.setNetworkKey = function (channelNr, errorCallback, successCallback) {
        var self = this;
        var channel = this.channelConfiguration[channelNr], message = new ANTMessage();

        //console.log("Setting network key on net " + channel.network.number + " key: " + channel.network.key +" channel "+channel.number);

        this.sendAndVerifyResponseNoError(message.create_message(ANTMessage.prototype.MESSAGE.set_network_key, Buffer.concat([new Buffer([channel.network.number]), new Buffer(channel.network.key)])), ANTMessage.prototype.MESSAGE.set_network_key.id, errorCallback, successCallback);
    
    };

    ANT.prototype.assignChannel = function (channelNr, errorCallback, successCallback) {

        var channel = this.channelConfiguration[channelNr], self = this, message = new ANTMessage();

        //console.log("Assign channel " + channel.number + " to channel type " + Channel.prototype.CHANNEL_TYPE[channel.channelType] + "(" +
        //    channel.channelType + ")" + " on network " + channel.network.number);

        // Assign channel command should be issued before any other channel configuration messages (p. 64 ANT Message Protocol And Usaga Rev 50) ->
        // also sets defaults values for RF, period, tx power, search timeout p.22
        if (typeof channel.extendedAssignment === "undefined") // i.e background scanning
            this.sendAndVerifyResponseNoError(message.create_message(ANTMessage.prototype.MESSAGE.assign_channel, new Buffer([channel.number, channel.channelType, channel.network.number])), ANTMessage.prototype.MESSAGE.assign_channel.id, errorCallback, successCallback);
        else if (typeof this.capabilities !== "undefined" && this.capabilities.options.CAPABILITIES_EXT_ASSIGN_ENABLED) {
            this.sendAndVerifyResponseNoError(message.create_message(ANTMessage.prototype.MESSAGE.assign_channel, new Buffer([channel.number, channel.channelType, channel.network.number, channel.extendedAssignment])), ANTMessage.prototype.MESSAGE.assign_channel.id, errorCallback, successCallback);
        } else if (typeof this.capabilities !== "undefined" && !this.capabilities.options.CAPABILITIES_EXT_ASSIGN_ENABLED)
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Device does not support extended assignment");
    };

    ANT.prototype.setChannelId = function (channelNr, errorCallback, successCallback) {

        //(false, 0, 0, 0, 0),  // Search, no pairing   
        //                        DEFAULT_RETRY, ANT_DEVICE_TIMEOUT,
        //                        function () { exit("Failed to set channel id.") },
        // ANTWARE II - log file   1061.985 { 798221031} Tx - [A4][05][51][00][00][00][78][00][88][00][00]

        var set_channel_id_msg, self = this, message = new ANTMessage();
        var channel = this.channelConfiguration[channelNr];
        //console.log("Setting channel id. - channel number " + channel.number + " device type " + channel.deviceType + " transmission type " + channel.transmissionType);

        var buf = new Buffer(5);
        buf[0] = channel.number;
        buf.writeUInt16LE(channel.channelID.deviceNumber, 1); // If slave 0 matches any device number / dev id.
        // Seems like its not used at least for slave?  buf[3] = channel.deviceType & 0x80; // If bit 7 = 1 -> master = request pairing, slave = find pairing transmitter -> (pairing bit)
        // Pairing bit-set in Channel object, if pairing requested deviceType = deviceType | 0x80;
        buf[3] = channel.channelID.deviceType;
        buf[4] = channel.channelID.transmissionType; // Can be set to zero (wildcard) on a slave device, spec. p. 18 ANT Message Protocol and Usage, rev 5.0

        set_channel_id_msg = message.create_message(ANTMessage.prototype.MESSAGE.set_channel_id, buf);

        this.sendAndVerifyResponseNoError(set_channel_id_msg, ANTMessage.prototype.MESSAGE.set_channel_id.id, errorCallback, successCallback);

    };

    ANT.prototype.setChannelPeriod = function (channelNr, errorCallback, successCallback) {

        var set_channel_period_msg, rate, self = this, message = new ANTMessage();
        var channel = this.channelConfiguration[channelNr];
   
        var msg = "";

        if (channel.isBackgroundSearchChannel())
            msg = "(Background search channel)";

        //console.log("Set channel period for channel " + channel.number + " to " + channel.periodFriendly + " value: " + channel.period);

        if (typeof channel.period !== "undefined") {
            var buf = new Buffer(3);
            buf[0] = channel.number;
            buf.writeUInt16LE(channel.period, 1);

            set_channel_period_msg = message.create_message(ANTMessage.prototype.MESSAGE.set_channel_messaging_period, new Buffer(buf));

            this.sendAndVerifyResponseNoError(set_channel_period_msg, ANTMessage.prototype.MESSAGE.set_channel_messaging_period.id, errorCallback, successCallback);
        } else {
        
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Channel period not specified for channel "+channel.number+" "+msg);
            successCallback(); // Continue with configuration

        }

    };

    // Low priority search mode
    // Spec. p. 72 : "...a low priority search will not interrupt other open channels on the device while searching",
    // "If the low priority search times out, the module will switch to high priority mode"
    ANT.prototype.setLowPriorityChannelSearchTimeout = function (channelNr, errorCallback, successCallback) {

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
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Device does not support setting low priority search");
    };

    // High priority search mode
    ANT.prototype.setChannelSearchTimeout = function (channelNr, errorCallback, successCallback) {

        // Each count in ucSearchTimeout = 2.5 s, 255 = infinite, 0 = disable high priority search mode (default search timeout is 25 seconds)
        var channel_search_timeout_msg, self = this;
        var channel = this.channelConfiguration[channelNr], message = new ANTMessage();

        if (typeof channel.searchTimeout === "undefined") {
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No high priority search timeout specified for channel " + channel.number);
            successCallback();
        } else {
            //console.log("Set channel search timeout channel " + channel.number + " timeout " + channel.searchTimeout);
            var buf = new Buffer([channel.number, channel.searchTimeout]);

            channel_search_timeout_msg = message.create_message(ANTMessage.prototype.MESSAGE.set_channel_search_timeout, buf);

            this.sendAndVerifyResponseNoError(channel_search_timeout_msg, ANTMessage.prototype.MESSAGE.set_channel_search_timeout.id, errorCallback, successCallback);
        }

    };

    ANT.prototype.setChannelRFFrequency = function (channelNr, errorCallback, successCallback) {
        // ucRFFreq*1Mhz+2400 Mhz
        var RFFreq_msg, self = this;
        var channel = this.channelConfiguration[channelNr], message = new ANTMessage();

        console.log("Set channel RF frequency channel " + channel.number + " frequency " + channel.RFfrequency);
        RFFreq_msg = message.create_message(ANTMessage.prototype.MESSAGE.set_channel_RFFreq, new Buffer([channel.number, channel.RFfrequency]));
        this.sendAndVerifyResponseNoError(RFFreq_msg, ANTMessage.prototype.MESSAGE.set_channel_RFFreq.id, errorCallback, successCallback);
    
    };

    ANT.prototype.setSearchWaveform = function (channelNr, errorCallback, successCallback) {
        // waveform in little endian!

        var set_search_waveform_msg, self = this,
            buf = new Buffer(3);
        var channel = this.channelConfiguration[channelNr], message = new ANTMessage();

        if (typeof channel.searchWaveform === "undefined") {
            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "No search waveform specified");
            errorCallback();
        }

        //console.log("Set channel search waveform channel " + channel.number + " waveform " + channel.searchWaveform);

        buf[0] = channel.number;
        buf[1] = channel.searchWaveform[0];
        buf[2] = channel.searchWaveform[1];
        set_search_waveform_msg = message.create_message(ANTMessage.prototype.MESSAGE.set_search_waveform, new Buffer(buf));

        this.sendAndVerifyResponseNoError(set_search_waveform_msg, ANTMessage.prototype.MESSAGE.set_search_waveform.id, errorCallback, successCallback);
    
    };

    ANT.prototype.openRxScanMode = function (channelNr, errorCallback, successCallback, noVerifyResponseNoError) {
        var openRxScan_channel_msg, self = this, message = new ANTMessage();
        var channel = this.channelConfiguration[channelNr];
        //self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Opening channel " + channel.number);
        openRxScan_channel_msg = message.create_message(ANTMessage.prototype.MESSAGE.open_rx_scan_mode, new Buffer([0]));

        this.sendAndVerifyResponseNoError(openRxScan_channel_msg, ANTMessage.prototype.MESSAGE.open_rx_scan_mode.id, errorCallback, successCallback, noVerifyResponseNoError);
    },

    ANT.prototype.open = function (channelNr, errorCallback, successCallback, noVerifyResponseNoError) {
        //console.log("Opening channel "+ucChannel);
        var open_channel_msg, self = this;
        var channel = this.channelConfiguration[channelNr], message = new ANTMessage();
        //self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Opening channel " + channel.number);
        open_channel_msg = message.create_message(ANTMessage.prototype.MESSAGE.open_channel, new Buffer([channel.number]));

        this.sendAndVerifyResponseNoError(open_channel_msg, ANTMessage.prototype.MESSAGE.open_channel.id, errorCallback, successCallback,noVerifyResponseNoError);
    };

    // Closing first gives a response no error, then an event channel closed
    ANT.prototype.close = function (channelNr, errorCallback, successCallback, noVerifyResponseNoError) {
        //console.log("Closing channel "+ucChannel);
        var close_channel_msg, self = this;
        var channel = this.channelConfiguration[channelNr], message = new ANTMessage();
        //console.log("Closing channel " + channel.number);
        close_channel_msg = message.create_message(ANTMessage.prototype.MESSAGE.close_channel, new Buffer([channel.number]));

        this.sendOnly(close_channel_msg, ANT.prototype.ANT_DEFAULT_RETRY, 500, errorCallback,
            function success() {
                var retryNr = 0;

                function retryEventChannelClosed() {

                    self.receive(500, errorCallback,
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
                    self.receive(500, errorCallback,
                                 function success(data) {
                                     if (!self.isResponseNoError(data, ANTMessage.prototype.MESSAGE.close_channel.id)) {
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

        return (msgId === ANTMessage.prototype.MESSAGE.channel_response.id && eventOrResponse === EVENT && code === eventCode);
    };

    // Check if channel response is a no error for a specific requested message id
    ANT.prototype.isResponseNoError = function (data, requestedMsgId) {
        var msgId = data[2], msgRequested = data[4], msgCode = data[5];

        //console.log(Date.now() + " Validation");
        //console.log(data, requestedMsgId);

        return (msgId === ANTMessage.prototype.MESSAGE.channel_response.id && msgCode === ANT.prototype.RESPONSE_EVENT_CODES.RESPONSE_NO_ERROR && msgRequested === requestedMsgId);

    };

    ANT.prototype.sendAndVerifyResponseNoError = function (message, msgId, errorCB, successCB,noVerification) {
        var self = this;
        this.sendOnly(message, ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT, errorCB,
        function success() {
       
            //if (typeof noVerification === "undefined") {
            //    self.receive(ANT.prototype.ANT_DEVICE_TIMEOUT, errorCB,
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
    // 3rd option : GO_TO_SEARCH is received if channel is dropped -> channel should be unassigned
    ANT.prototype.sendAcknowledgedData = function (ucChannel, pucBroadcastData, errorCallback, successCallback) {
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

                if (resendMsg.retry <= ANT.prototype.TX_DEFAULT_RETRY) {
                    resendMsg.lastRetryTimestamp = Date.now();
                    // Two-levels of transfer : 1. from app. to ANT via libusb and 2. over RF 
                    self.sendOnly(ack_msg, ANT.prototype.ANT_DEFAULT_RETRY, ANT.prototype.ANT_DEVICE_TIMEOUT,
                        function error(err) {
                            self.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Failed to send acknowledged data packet to ANT engine, due to problems with libusb <-> device"+ err);
                            if (typeof errorCallback === "function")
                                errorCallback(err);
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
            }
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

        resendMsg.retryCB();

    };

    // Send an individual packet as part of a bulk transfer
    ANT.prototype.sendBurstTransferPacket = function (ucChannelSeq, packet, errorCallback, successCallback) {

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

    ANT.prototype.receive = function (successCallback) {

        //self.device.timeout = timeout;
        var receiveCB = function _successCB(data) {
            if (typeof data !== "undefined")
                this._stream.push(data)
            successCallback(data);
        };

        this.usb.receive(receiveCB.bind(this));

    };

    ANT.prototype.send = function (chunk, successCallback) {
        this.usb.send(chunk, successCallback);
    }

    module.exports = ANT;