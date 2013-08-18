"use strict"

/* Standard message :
       SYNC MSGLENGTH MSGID CHANNELNUMBER PAYLOAD (8 bytes) CRC
*/

function ANTMessage(data) {
    //console.log("DATA", data);
   
   // initStream.bind(this)();

   // this.timestamp = Date.now();
   // this.SYNC = ANTMessage.prototype.SYNC;

    if (data) {
        this.buffer = data;
        this.SYNC = data[0];
        this.length = data[1];
        this.id = data[2];
        this.content = data.slice(3, 3 + this.length);
        //console.log("CONTENT", this.content);
        this.CRC = data[3 + this.length];
    } 
}

ANTMessage.prototype.SYNC = 0xA4; // Every raw ANT message starts with SYNC

ANTMessage.prototype.FILLER_BYTE_BUFFER = new Buffer([0]);

ANTMessage.prototype.isSYNCOK = function () {
    return (this.SYNC === ANTMessage.prototype.SYNC);
}


ANTMessage.prototype.toString = function () {
    return "ANT message:" +
        " SYNC 0x" + this.SYNC.toString(16) + " = "+this.SYNC +
        " length 0x" + this.length.toString(16) + " = "+this.length+
        " id 0x" + this.id.toString(16) + " = "+this.id+
        " content " + this.content + 
        " CRC 0x" + this.CRC.toString(16)+" = "+this.CRC;
}

ANTMessage.prototype.getContent = function () {
    return this.content;
}

ANTMessage.prototype.setContent = function (content) {
    this.content = content;
}
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
     headerBuffer = new Buffer(3),
     messageBuffer,
     trailingZeroBuffer,
     content,
     content_len,
     byteNr;
    
    
  //  console.log("args", arguments);

    // TEST 3 - provoke "ANT Message too large" 
    //content = new Buffer(200);
    content = this.content;
    if (content)
        content_len = content.length;
    else {
       // this.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Content length is 0");
        content_len = 0;
    }

    //console.log("Message id. ", message.id, " Content is ", content);

    //contentBuffer = new Buffer(content_len);
    //if (content_len > 8)
    //    console.warn("Content length of message is ", content_len);

    // Header
    // SYNC = 0; // -> Provoke Serial Error Message, error 0 - SYNC incorrect, should be 0xA4

    
    // TEST 1 error number 0 serial error - not SYNC
    //headerBuffer.writeUInt8(1, 0);

    headerBuffer.writeUInt8(ANTMessage.prototype.SYNC, 0);
    headerBuffer.writeUInt8(content_len, 1);
    headerBuffer.writeUInt8(this.id, 2);

    //// Content
    //for (var byteNr = 0; byteNr < content_len; byteNr++)
    //    contentBuffer.writeUInt8(content.readUInt8(byteNr), byteNr);

    this.buffer = Buffer.concat([headerBuffer, content], 3 + content_len);

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
    this.checksum = this.getCRC(this.buffer);

    this.buffer = Buffer.concat([this.buffer, new Buffer([this.checksum])], 4 + content_len);

    //console.log("Checksum  : " + checksum);
    //console.log("Raw message length : " + msg.length+", content length: "+content_len);

    // Add trailing zeroes - seems to work ok without trailing zeros, but recommended, will delay ANT chip setting RTS for 50 microsec. after message is received

    if (content_len < 8) {
        trailingZeroBuffer = this.getPadZeroBuffer(8 - content_len - 1);
        //trailingZeroBuffer = new Buffer(8 - content_len - 1); // CRC included in payload
        //for (byteNr = 0; byteNr < 8 - content_len - 1; byteNr++)
        //    trailingZeroBuffer.writeUInt8(0, byteNr);

        this.buffer = Buffer.concat([this.buffer, trailingZeroBuffer]);
    }

    
    //this.SYNC = ANTMessage.prototype.SYNC;
    this.length = content_len;

    return this.buffer;

 
};

// Create a buffer with zeros
ANTMessage.prototype.getPadZeroBuffer = function (size) {

        var buf = new Buffer(size), i, len = buf.length;
        for (var i = 0; i < len; i++)
            buf[i] = 0x00;
    
        return buf;
    
}

ANTMessage.prototype.getBuffer = function () {
    return this.buffer;
}

ANTMessage.prototype.toBuffer = ANTMessage.prototype.getBuffer;

// CheckSUM = XOR of all bytes in message
ANTMessage.prototype.getCRC = function (messageBuffer) {
    var checksum = messageBuffer[0], // Should be SYNC 0xA4
        len = messageBuffer[1] + 3, // Should be messageBuffer.length - 1
        byteNr;
    // console.trace();
    // console.log("Start checksum", checksum.toString(16), "RAW",messageBuffer,"length",len,"messageBuffer.length",messageBuffer.length);

    for (byteNr = 1; byteNr < len; byteNr++) {
        checksum = checksum ^ messageBuffer[byteNr];
        //console.log("Checksum", checksum, "byte nr", byteNr, "value:", messageBuffer.readUInt8(byteNr));
    }

    return checksum;
};


ANTMessage.prototype.getMessageId = function ()
{
    return this.id;
}

ANTMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16);
}

// ANT message ID - from sec 9.3 ANT Message Summary ANT Message Protocol And Usage Rev 50
ANTMessage.prototype.MESSAGE = {

    // Control messages

    //0x4A: "Reset system",
    RESET_SYSTEM:  0x4A,

    0x4b: "Open channel",
    open_channel: { id: 0x4b, friendly: "Open channel" },

    0x4c: "Close channel",
    close_channel: { id: 0x4c, friendly: "Close channel" },

    0x5b: "Open RX scan mode",
    open_rx_scan_mode: { id: 0x5b, friendly: "Open RX scan mode" },

    0xc5: "Sleep message",
    sleep_message: { id: 0xc5, friendly: "Sleep message" },

    // Notification messages 
    //0x6f: "Notification: Start up",
    NOTIFICATION_STARTUP: 0x6F,

   // 0xae: "Notification: Serial error",
    NOTIFICATION_SERIAL_ERROR: 0xAE,

    // Requested messages with REQUEST 0x4D 
    
    ANT_VERSION:  0x3E,

    //0x54: "Capabilities",
    CAPABILITIES:  0x54,

    DEVICE_SERIAL_NUMBER:  0x61,

    // Request/response

    //0x4d: "Request",
    REQUEST: 0x4D,

    //0x40: "Channel response/event",
    CHANNEL_RESPONSE:  0x40,
    
    CHANNEL_STATUS: 0x52,

    // Config messages
    // All conf. commands receive a response, typically "RESPONSE_NO_ERROR"

    0x41: "UnAssign Channel",
    UNASSIGN_CHANNEL: 0x41,
   
    0x42 : "Assign Channel",
    ASSIGN_CHANNEL: 0x42,

    0x51: "Set Channel ID",
    SET_CHANNEL_ID: 0x51,

    0x46: "Set network key",
    SET_NETWORK_KEY: 0x46,

    0x47: "Set transmit power",
    SET_TRANSMIT_POWER:  0x47,

    0x43: "Set channel period (Tch)",
    SET_CHANNEL_MESSAGING_PERIOD:  0x43,

    0x63: "Low priority (LP) search timeout",
    set_low_priority_channel_search_timeout: { id: 0x63, friendly: "Set low priority (LP) Channel Search Timeout" },

    0x44: "High priority (HP) search timeout",
    SET_CHANNEL_SEARCH_TIMEOUT:  0x44,

    0x45: "Channel RF frequency",
    SET_CHANNEL_RFFREQ:  0x45,

    //0x49: "Search waveform",
    //set_search_waveform: { id: 0x49, friendly: "Set search waveform" },

    0x75: "Channel Search Priority",
    set_channel_search_priority: { id: 0x75, friendly: "Set channel search priority" },

    0x6E: "Lib Config",
    libConfig: { id: 0x6E, friendly: "Lib Config" },

    0x66: "Enable Extended Messages",
    RxExtMesgsEnable: { id: 0x66, friendly: "Enable Extended Messages" },

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

module.exports = ANTMessage;