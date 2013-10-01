/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
var ANTMessage = require('messages/ANTMessage'),
    LibConfig = require('messages/libConfig'),
    ChannelId = require('messages/channelId'),
    RSSI = require('messages/rssi'),
    RXTimestamp = require('messages/RXTimestamp');

function BroadcastDataMessage(data) {
    
    ANTMessage.call(this,data);

    this.name = "Broadcast Data";
    this.id = ANTMessage.prototype.MESSAGE.BROADCAST_DATA;

    // Pre-create properties extended broadcast for fast access
    this.channelId = new ChannelId();
    this.RSSI = new RSSI();
    this.RXTimestamp = new RXTimestamp();
}

BroadcastDataMessage.prototype = Object.create(ANTMessage.prototype);

BroadcastDataMessage.prototype.constructor = BroadcastDataMessage;

// Spec. p. 91
BroadcastDataMessage.prototype.parse = function () {
    var sharedAddress,
        dataView;

    this.channel = this.content[0];
    this.data = this.content.slice(1, 9); // Data 0 .. 7 - assume independent channel

    // 'RX' <Buffer a4 14 4e 01 04 00 f0 59 a3 5f c3 2b e0 af 41 78 01 10 00 69 00 ce f6 70>
    // 'Broadcast Data ID 0x4e C# 1 ext. true Flag 0xe0' <Buffer 04 00 f0 59 a3 5f c3 2b>
    this.extendedDataMessage = (this.content.length > 9) ? true : false;
    if (this.extendedDataMessage) {
        this.flagsByte = this.content[9];
        this.extendedData = this.content.slice(10);

        // Check for channel ID
        // p.37 spec: relative order of extended messages; channel ID, RSSI, timestamp (based on 32kHz clock, rolls over each 2 seconds)
        if (this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) {
            this.channelId.parse(this.extendedData.slice(0, 4));

            // Spec. p. 27 - single master controls multiple slaves - possible to have a 1 or 2-byte shared address field at the start of data payload
            sharedAddress = this.channelId.getSharedAddressType();

            if (sharedAddress === ChannelId.prototype.SHARED_ADDRESS_TYPE.ADDRESS_1BYTE) {
                this.sharedAddress = this.content[0]; // 1 byte is the shared address 0 = broadcast to all slaves
                this.data = this.content.slice(2, 9);

            } else if (sharedAddress === ChannelId.prototype.SHARED_ADDRESS_TYPE.ADDRESS_2BYTE) {
                this.sharedAddress = (new DataView(this.content,0,2)).getUint16(0,true); // 2-bytes LSB MSB shared address 0 = broadcast to all slaves
                this.data = this.content.slice(3, 9);
            }
        }

        if (this.flagsByte & LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED) 
            this.RXTimestamp.parse(this.extendedData.slice(-2));
        
        if (!(this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) && (this.flagsByte & LibConfig.prototype.Flag.RSSI_ENABLED)) {
            this.RSSI.parse(this.extendedData.slice(0, 2));
        }

        if ((this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) && (this.flagsByte & LibConfig.prototype.Flag.RSSI_ENABLED)) {
            this.RSSI.parse(this.extendedData.slice(4, 7));
        }
    }

};

// Parsing of the "flagged extended data message format"
//BroadcastDataMessage.prototype.parse_extended_message = function (channel, data) {
//    var msgLength = data[1], msgFlag,
//        self = this,
//        relativeIndex = 9,
//        previous_RX_Timestamp;


//    if (msgLength <= relativeIndex) {
//        self.emit(Host.prototype.EVENT.LOG_MESSAGE, " No extended message info. available");
//        return;
//    }

//    //console.log("Extended message flag + {channelID+RSSI+RX_Timestamp} + CRC", data.slice(4+8), "message length:",msgLength);

//    msgFlag = data[12];

//    

//    if (msgFlag & Host.prototype.LIB_CONFIG.ENABLE_CHANNEL_ID) {
//        this.parseChannelID(data, relativeIndex);
//        relativeIndex = relativeIndex + 8; // Channel ID = Device Number 2-bytes + Device type 1 byte + Transmission Type 1 byte
//    }

//    if (msgFlag & Host.prototype.LIB_CONFIG.ENABLE_RSSI) {
//        this.parse_extended_RSSI(channel, data, relativeIndex);
//        relativeIndex = relativeIndex + 4;
//    }

//    if (msgFlag & Host.prototype.LIB_CONFIG.ENABLE_RX_TIMESTAMP) {
//        // console.log(data,relativeIndex);
//        if (typeof this.channelConfiguration[channel].RX_Timestamp)
//            previous_RX_Timestamp = this.channelConfiguration[channel].RX_Timestamp;
//        // Some times RangeError is generated during SIGINT
//        try {
//            //if (relativeIndex <= data.length -2) {
//            this.channelConfiguration[channel].RX_Timestamp = data.readUInt16LE(relativeIndex);
//            if (typeof previous_RX_Timestamp !== "undefined") {
//                this.channelConfiguration[channel].RX_Timestamp_Difference = this.channelConfiguration[channel].RX_Timestamp - previous_RX_Timestamp;
//                if (this.channelConfiguration[channel].RX_Timestamp_Difference < 0) // Roll over
//                    this.channelConfiguration[channel].RX_Timestamp_Difference += 0xFFFF;
//            }
//            // } else
//            //     console.log(Date.now(), "Attempt to UInt16LE read RX_Timestamp buffer data length :", data.length, "at index", relativeIndex,data);
//        } catch (err) {
//            console.log(Date.now(), "Parsing extended packet info RX_Timestamp Data length : ", data.length, "relativeIndex", relativeIndex, data, err);
//            //throw err;
//        }


//        //console.log("Timestamp", this.channelConfiguration[channel].RX_Timestamp);
//    }
//};


//BroadcastDataMessage.prototype.parse_extended_RSSI = function (channel, data, startIndex) {
//    //console.log("CHANNEL NR: ",channel,"startIndex",startIndex,"data:",data);
//    // http://www.thisisant.com/forum/viewthread/3841 -> not supported on nRF24AP2....
//    // Create new RSSI object if not available
//    var self = this;
//    if (typeof this.channelConfiguration[channel].RSSI === "undefined")
//        this.channelConfiguration[channel].RSSI = {};

//    this.channelConfiguration[channel].RSSI.measurementType = data[startIndex];

//    if (this.channelConfiguration[channel].RSSI.measurementType === Host.prototype.RSSI.MEASUREMENT_TYPE.DBM) {
//        this.channelConfiguration[channel].RSSI.value = data[startIndex + 1];
//        this.channelConfiguration[channel].RSSI.thresholdConfigurationValue = data[startIndex + 2];
//    }
//    //else
//    //    this.emit(Host.prototype.EVENT.LOG_MESSAGE, " Cannot decode RSSI, unknown measurement type " + this.channelConfiguration[channel].RSSI.measurementType);

//    //console.log(this.channelConfiguration[channel].RSSI);
//    this.channelConfiguration[channel].RSSI.toString = function () {
//        var str;

//        str = "Measurement type 0x" + self.channelConfiguration[channel].RSSI.measurementType.toString(16);

//        if (self.channelConfiguration[channel].RSSI.value)
//            str += " RSSI value " + self.channelConfiguration[channel].RSSI.value;

//        if (self.channelConfiguration[channel].RSSI.thresholdConfigurationValue)
//            str += " Threshold conf. value " + self.channelConfiguration[channel].RSSI.thresholdConfigurationValue;

//        return str;
//    };

//    return this.channelConfiguration[channel].RSSI;

//};

//BroadcastDataMessage.prototype.parseChannelID = function (data, relIndex) {


//    var channelID =
//     {
//         channelNumber: data[3]
//     },
//        self = this, relativeIndex = 0;

//    if (typeof relIndex !== "undefined") // Extended messages parsing
//        relativeIndex = relIndex;

//    if (7 + relativeIndex < data.length) {
//        channelID.deviceNumber = data.readUInt16LE(4 + relativeIndex);
//        channelID.deviceTypeID = data[6 + relativeIndex];
//        channelID.transmissionType = data[7 + relativeIndex];

//        channelID.toProperty = "CHANNEL_ID_" + channelID.channelNumber + "_" + channelID.deviceNumber + "_" + channelID.deviceTypeID + "_" + channelID.transmissionType;

//        //console.log("parsed channelID ",channelID.toProperty,"relative Index",relativeIndex);

//        channelID.toString = function () {
//            return "Channel # " + channelID.channelNumber + " device # " + channelID.deviceNumber + " device type " + channelID.deviceTypeID + " transmission type " + channelID.transmissionType + " " + self.parseTransmissionType(channelID.transmissionType);
//        };


//        this.channelConfiguration[channelID.channelNumber].channelID = channelID;
//        this.channelConfiguration[channelID.channelNumber].hasUpdatedChannelID = true;

//        //this.emit(Host.prototype.EVENT.LOG_MESSAGE, channelID.toString());

//    } else {
//        console.log(Date.now(), "Attempt to read beyond data buffer length data length", data.length, "relativeIndex", relativeIndex, data);
//    }

//    //console.log(channelID.toString());
//    return channelID;
//};

//BroadcastDataMessage.prototype.RSSI =
//    


BroadcastDataMessage.prototype.toString = function () {
    var msg = this.name + " ID 0x" + this.id.toString(16) + " C# " + this.channel;
    if (this.extendedDataMessage)
        msg += " " + "ext. " + this.extendedDataMessage + " Flags 0x" + this.flagsByte.toString(16);

    return msg;
};

module.exports = BroadcastDataMessage;
    return module.exports;
});

