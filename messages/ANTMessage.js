/* global define: true, ArrayBuffer: true, Uint8Array: true */


//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
/* Standard message :
       SYNC MSGLENGTH MSGID CHANNELNUMBER CONTENT (8 bytes) CRC
*/
    
    var LibConfig = require('messages/libConfig'),
        
        // Extended data if requested by libconfig
        ChannelId = require('messages/channelId'),
        RSSI = require('messages/RSSI'),
        RXTimestamp = require('messages/RXTimestamp');

function ANTMessage(data) {
    
    this.timestamp = Date.now();

    // Extended data - channelID, RX timestamp and RSSI
    
//    this.channelId = new ChannelId();
       this.channelId = undefined;
//    this.RXTimestamp = new RXTimestamp();
       this.RXTimestamp = undefined;
    
    this.RSSI = undefined;
   
   // this.timestamp = Date.now();
   // this.SYNC = ANTMessage.prototype.SYNC;
    
    if (data) 
        this.mainParse(data);
    
}

ANTMessage.prototype.SYNC = 0xA4; // Every raw ANT message starts with SYNC

ANTMessage.prototype.FILLER_BYTE = 0x00;


ANTMessage.prototype.mainParse = function (data)
{
    //        if (data.byteOfset !== 0)
    //          console.warn("DATA", data,"byte offset",data.byteOffset);
    //this.buffer = data;
    this.USBBuffer = data;
    this.SYNC = data[0];
    this.length = data[1];
    this.id = data[2];
    //this.content = new Uint8Array(data.buffer.slice(3, 3 + this.length)); // Easier to debug Uint8Array than ArrayBuffer
    this.content = data.subarray(3, 3 + this.length);
    //console.log("CONTENT", this.content);
    this.CRC = data[3 + this.length];

    // Extended message

    // TO DO : Check Acknoledged Data and Advanced Burst Transfer data
    if ((this.id === ANTMessage.prototype.MESSAGE.BROADCAST_DATA ||
         this.id === ANTMessage.prototype.MESSAGE.BURST_TRANSFER_DATA) &&
         this.content.length > 9) {

        this.flagsByte = this.content[9];
        //this.extendedData = new Uint8Array(this.content.buffer.slice(10));
        this.extendedData = this.content.subarray(10); // Subarray creates a view to underlying arraybuffer
        // Check for channel ID
        // p.37 spec: relative order of extended messages; channel ID, RSSI, timestamp (based on 32kHz clock, rolls over each 2 seconds)
        if (this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) {
            if (!this.channelId)
                this.channelId = new ChannelId();
            //this.channelId.parse(this.extendedData.buffer.slice(0, 4));
            this.channelId.parse(this.extendedData.subarray(0, 4));

            // Spec. p. 27 - single master controls multiple slaves - possible to have a 1 or 2-byte shared address field at the start of data payload
            //            sharedAddress = this.channelId.getSharedAddressType();
            //
            //            if (sharedAddress === ChannelId.prototype.SHARED_ADDRESS_TYPE.ADDRESS_1BYTE) {
            //                this.sharedAddress = this.content[0]; // 1 byte is the shared address 0 = broadcast to all slaves
            //                this.data = this.content.subarray(2, 9);
            //
            //            } else if (sharedAddress === ChannelId.prototype.SHARED_ADDRESS_TYPE.ADDRESS_2BYTE) {
            //                this.sharedAddress = (new DataView(this.content,0,2)).getUint16(0,true); // 2-bytes LSB MSB shared address 0 = broadcast to all slaves
            //                this.data = this.content.subarray(3, 9);
            //            }
        }

        if (this.flagsByte & LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED) {
            if (!this.RXTimestamp)
                this.RXTimestamp = new RXTimestamp();
            // this.RXTimestamp.parse(this.extendedData.buffer.slice(-2));
            this.RXTimestamp.parse(this.extendedData.subarray(-2));
        }

        if (!(this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) && (this.flagsByte & LibConfig.prototype.Flag.RSSI_ENABLED)) {
            //this.RSSI.parse(this.extendedData.buffer.slice(0, 2));
            if (!this.RSSI)
                this.RSSI = new RSSI();
            this.RSSI.parse(this.extendedData.subarray(0, 2));
        }

        if ((this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) && (this.flagsByte & LibConfig.prototype.Flag.RSSI_ENABLED)) {
            //this.RSSI.parse(this.extendedData.buffer.slice(4, 7));
            if (!this.RSSI)
                this.RSSI = new RSSI();
            this.RSSI.parse(this.extendedData.subarray(4, 7));
        }
    }
};

ANTMessage.prototype.isSYNCOK = function () {
    return (this.SYNC === ANTMessage.prototype.SYNC);
};
    
ANTMessage.prototype.TYPE = {
    REQUEST : "request",
    RESPONSE : "response" };
    
ANTMessage.prototype.getType = function ()
{
    return this.type;
};

ANTMessage.prototype.isResponse = function ()
{
    if (this.getType() === ANTMessage.prototype.TYPE.RESPONSE)
        return true;
    else
        return false;
};

ANTMessage.prototype.toString = function () {
    return "ANT message:" +
        " SYNC 0x" + this.SYNC.toString(16) + " = "+this.SYNC +
        " length 0x" + this.length.toString(16) + " = "+this.length+
        " id 0x" + this.id.toString(16) + " = "+this.id+
        " content " + this.content + 
        " CRC 0x" + this.CRC.toString(16)+" = "+this.CRC +
        " type "+ this.getType();
};

ANTMessage.prototype.getContent = function () {
    return this.content;
};

ANTMessage.prototype.setContent = function (content) {
    this.content = content;
};
/*
This function create a raw message 
 Message format
 SYNC MSG_LENGTH MSG_ID MSG_CONTENT CRC

 SYNC = 10100100 = 0xA4 or 10100101 (MSB:LSB)
 CRC = XOR of all bytes in message
 Sending of LSB first = little endian NB!
*/
ANTMessage.prototype.getRawMessage = function () {
    var
//     headerBuffer = new Buffer(3),
//     messageBuffer,
//     trailingZeroBuffer,
     content,
     content_len,
//     byteNr,
        standardMessage = new Uint8Array(13);
    
    
  //  console.log("args", arguments);

    // TEST 3 - provoke "ANT Message too large" 
    //content = new Buffer(200);
    content = this.content;
    //console.log("typeof content",typeof this.content);
    if (content)
        content_len = content.byteLength;
    else {
       // this.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Content length is 0");
        content_len = 0;
    }
    
    if (typeof content_len === "undefined")
        console.log("ANTMessage: content length is undefined, check .byteLength property");

    //console.log("Message id. ", message.id, " Content is ", content);

    //contentBuffer = new Buffer(content_len);
    //if (content_len > 8)
    //    console.warn("Content length of message is ", content_len);

    // Header
    // SYNC = 0; // -> Provoke Serial Error Message, error 0 - SYNC incorrect, should be 0xA4

    
    // TEST 1 error number 0 serial error - not SYNC
    //headerBuffer.writeUInt8(1, 0);

//    headerBuffer.writeUInt8(ANTMessage.prototype.SYNC, 0);
//    headerBuffer.writeUInt8(content_len, 1);
//    headerBuffer.writeUInt8(this.id, 2);
    
    standardMessage[0] = ANTMessage.prototype.SYNC;
    standardMessage[1] = content_len;
    standardMessage[2] = this.id;
    
    var contentArr = new Uint8Array(this.content);
    //console.log("Setting content of message to ",contentArr, this.content);
    standardMessage.set(contentArr,3);
    
    

    //// Content
    //for (var byteNr = 0; byteNr < content_len; byteNr++)
    //    contentBuffer.writeUInt8(content.readUInt8(byteNr), byteNr);

    //this.buffer = Buffer.concat([headerBuffer, content], 3 + content_len);

    // Checksum
    //console.log("Message buffer:", messageBuffer, "Message buffer length", messageBuffer.length, " content length: ", content_len, "content buffer: ", contentBuffer);

    //var checksum = messageBuffer.readUInt8(0);
    ////console.log("Start checksum", checksum);
    //for (byteNr = 1; byteNr < messageBuffer.length; byteNr++) {
    //    checksum = checksum ^ messageBuffer.readUInt8(byteNr);
    //    //console.log("Checksum", checksum, "byte nr", byteNr, "value:", messageBuffer.readUInt8(byteNr));
    //}


    // TEST -> Provoke Serial Error Message, error 2 - checksum of ANT msg. incorrect
    //var checksum = 0xFF;
    //this.checksum = this.getCRC(this.buffer);
    //console.log("SLICE",standardMessage.slice(0,content_len+3),content_len);
    this.checksum = this.getCRC(standardMessage.subarray(0,content_len+3));
    //console.log("CHECKSUM",this.checksum);
    standardMessage[content_len+3] = this.checksum;

    //this.buffer = Buffer.concat([this.buffer, new Buffer([this.checksum])], 4 + content_len);

    //console.log("Checksum  : " + checksum);
    //console.log("Raw message length : " + msg.length+", content length: "+content_len);

    // Add trailing zeroes - seems to work ok without trailing zeros, but recommended, will delay ANT chip setting RTS for 50 microsec. after message is received

//    if (content_len < 8) {
//        trailingZeroBuffer = this.getPadZeroBuffer(8 - content_len - 1);
//        //trailingZeroBuffer = new Buffer(8 - content_len - 1); // CRC included in payload
//        //for (byteNr = 0; byteNr < 8 - content_len - 1; byteNr++)
//        //    trailingZeroBuffer.writeUInt8(0, byteNr);
//
//        this.buffer = Buffer.concat([this.buffer, trailingZeroBuffer]);
//    }

    
    //this.SYNC = ANTMessage.prototype.SYNC;
    this.length = content_len;
//    
//    console.trace();
//    console.log("Standard msg",standardMessage);
    this.buffer = standardMessage.buffer; // Arraybuffer
    this.standardMessage = standardMessage;
    
    return this.standardMessage;
    
};

// Create a buffer with zeros
//ANTMessage.prototype.getPadZeroBuffer = function (size) {
//
//        var buf = new Buffer(size), i, len = buf.length;
//        for (i = 0; i < size; i++)
//            buf[i] = 0x00;
//    
//        return buf;
//    
//}

//ANTMessage.prototype.getBuffer = function () {
//    return this.buffer;
//};
//
//ANTMessage.prototype.toBuffer = ANTMessage.prototype.getBuffer;

// CheckSUM = XOR of all bytes in message
ANTMessage.prototype.getCRC = function (messageBuffer) {
    //console.log("GET CRC",messageBuffer);
    var checksum = messageBuffer[0], // Should be SYNC 0xA4
        len = messageBuffer[1] + 3, // Should be messageBuffer.length - 1
        byteNr;
    // console.trace();
   // console.log("Start checksum", checksum.toString(16), "RAW",messageBuffer,"length",len,"messageBuffer.length",messageBuffer.length);

    for (byteNr = 1; byteNr < len; byteNr++) {
        checksum = checksum ^ messageBuffer[byteNr];
     //   console.log("Checksum", checksum, "byte nr", byteNr, "value:", messageBuffer[byteNr]);
    }

    return checksum;
};


ANTMessage.prototype.getMessageId = function ()
{
    return this.id;
};

ANTMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16);
};

// ANT message ID - from sec 9.3 ANT Message Summary ANT Message Protocol And Usage Rev 50
ANTMessage.prototype.MESSAGE = {

    // Control messages

        0x4A: "Reset system",
        RESET_SYSTEM:  0x4A,

        0x4B: "Open channel",
        OPEN_CHANNEL:  0x4B,

        0x4C: "Close channel",
        CLOSE_CHANNEL:  0x4C,

        0x5B: "Open RX scan mode",
        OPEN_RX_SCAN_MODE : 0x5B,

        0xc5: "Sleep message",
        sleep_message: { id: 0xc5, friendly: "Sleep message" },

    // Notification messages 
        0x6F: "Notification: Start up",
        NOTIFICATION_STARTUP: 0x6F,

        0xAE: "Notification: Serial error",
        NOTIFICATION_SERIAL_ERROR: 0xAE,

    // Requested messages with REQUEST 0x4D 
    
        0x3E : "ANT Version",
        ANT_VERSION:  0x3E,

        0x54: "Capabilities",
        CAPABILITIES:  0x54,

        0x61: "Device Serial Number",
        DEVICE_SERIAL_NUMBER:  0x61,

        // Request/response

        0x4D: "Request",
        REQUEST: 0x4D,

        0x40: "Channel response/RF event",
        CHANNEL_RESPONSE:  0x40,
    
        0x52: "Channel Status",
        CHANNEL_STATUS: 0x52,

    // Config messages
    // All conf. commands receive a response, typically "RESPONSE_NO_ERROR"

        0x41: "UnAssign Channel",
        UNASSIGN_CHANNEL: 0x41,
   
        0x42 : "Assign Channel",
        ASSIGN_CHANNEL: 0x42,

        0x51: "Set Channel ID",
        SET_CHANNEL_ID: 0x51,
        CHANNEL_ID: 0x51,

        0x65: "Set Serial Num Channel ID",
        SET_SERIAL_NUM_CHANNEL_ID : 0x65,

        0x46: "Set network key",
        SET_NETWORK_KEY: 0x46,

        0x47: "Set transmit power",
        SET_TRANSMIT_POWER: 0x47,

        0x60: "Set Channel Tx Power",
        SET_CHANNEL_TX_POWER : 0x60,

        0x43: "Set channel period (Tch)",
        SET_CHANNEL_MESSAGING_PERIOD:  0x43,

        0x63: "Low priority (LP) search timeout",
        SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT:  0x63,

        0x44: "High priority (HP) search timeout",
        SET_CHANNEL_SEARCH_TIMEOUT:  0x44,

        0x45: "Channel RF frequency",
        SET_CHANNEL_RFFREQ:  0x45,

        //0x49: "Search waveform",
        //set_search_waveform: { id: 0x49, friendly: "Set search waveform" },

        0x75: "Channel Search Priority",
        set_channel_search_priority: { id: 0x75, friendly: "Set channel search priority" },

        0x6E: "Lib Config",
        LIBCONFIG:  0x6E,

        0x66: "Enable Extended Messages",
        RXEXTMESGSENABLE: { id: 0x66, friendly: "Enable Extended Messages" },

        0x71: "Set Proximity Search",
        SET_PROXIMITY_SEARCH : 0x71,

    // Data message

        0x4E: "Broadcast Data",
        BROADCAST_DATA:  0x4e,

        0x4F: "Acknowledged Data",
        ACKNOWLEDGED_DATA:  0x4F,

        0x50: "Burst Transfer Data",
        BURST_TRANSFER_DATA: 0x50,

        0x72: "Advanced Burst Transfer Data",
        ADVANCED_BURST_TRANSFER_DATA:  0x72

};

module.exports = ANTMessage;
    return module.exports;
});
