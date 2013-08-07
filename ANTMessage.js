/* Standard message :
       SYNC MSGLENGTH MSGID CHANNELNUMBER PAYLOAD (8 bytes) CRC
 */

function ANTMessage() {
}

ANTMessage.prototype.SYNC = 0xA4; // Every raw ANT message starts with SYNC

ANTMessage.prototype.NOTIFICATION = {

    STARTUP: {
        POWER_ON_RESET:{
            CODE : 0x00,
            MESSAGE : 'POWER_ON_RESET'
        },
        HARDWARE_RESET_LINE: {
            CODE : 0x01,
            MESSAGE : 'HARDWARE_RESET_LINE'
        },
        WATCH_DOG_RESET: {
            CODE : 0x02,
            MESSAGE : 'WATCH_DOG_RESET'
        },
        COMMAND_RESET: {
            CODE : 0x03,
            MESSAGE : 'COMMAND_RESET'
        },
        SYNCHRONOUS_RESET: {
            CODE : 0x04,
            MESSAGE : 'SYNCHRONOUS_RESET'
        },
        SUSPEND_RESET: {
            CODE: 0x05,
            MESSAGE: 'SUSPEND_RESET'
        }
    },

    SERIAL_ERROR: {
        FIRST_BYTE_NOT_SYNC: {
            CODE : 0x00,
            MESSAGE : 'First byte of USB packet not SYNC = 0xA4'
        },
        CRC_INCORRECT: {
            CODE : 0x02,
            MESSAGE : 'CRC of ANT message incorrect'
        },
        MESSAGE_TOO_LARGE: {
            CODE: 0x03,
            MESSAGE: 'ANT Message is too large'
        }
    }
};

ANTMessage.prototype.setMessage = function (data,parse)
{
    //console.log("DATA", data);
    this.timestamp = Date.now();
    this.USBdata = data;
    this.SYNC = data[0];
    this.length = data[1];
    this.id = data[2];
    this.content = data.slice(3, 3 + this.length);
    //console.log("CONTENT", this.content);
    this.CRC = data[3 + this.length];

    if (parse)
        this.parse();
}

ANTMessage.prototype.parseNotificationStartup = function (data) {
    var msg, code;

    var startupMessage;
       
    
    if (typeof data === "undefined")
        startupMessage = this.content[0];
    else
        startupMessage = data;

    if (startupMessage === 0) {
        msg = ANTMessage.prototype.NOTIFICATION.STARTUP.POWER_ON_RESET.MESSAGE
        code = ANTMessage.prototype.NOTIFICATION.STARTUP.POWER_ON_RESET.CODE;
    }
    else if (startupMessage === 1) {
        msg = ANTMessage.prototype.NOTIFICATION.STARTUP.HARDWARE_RESET_LINE.MESSAGE
        code = ANTMessage.prototype.NOTIFICATION.STARTUP.HARDWARE_RESET_LINE.CODE;
    }
    else if (startupMessage & (1 << 2)) {
        msg = ANTMessage.prototype.NOTIFICATION.STARTUP.WATCH_DOG_RESET.MESSAGE;
        code = ANTMessage.prototype.NOTIFICATION.STARTUP.WATCH_DOG_RESET.CODE;
    }
    else if (startupMessage & (1 << 5)) {
        msg = ANTMessage.prototype.NOTIFICATION.STARTUP.COMMAND_RESET.MESSAGE;
        code = ANTMessage.prototype.NOTIFICATION.STARTUP.COMMAND_RESET.CODE;
    }
    else if (startupMessage & (1 << 6)) {
        msg = ANTMessage.prototype.NOTIFICATION.STARTUP.SYNCHRONOUS_RESET.MESSAGE;
        code = ANTMessage.prototype.NOTIFICATION.STARTUP.SYNCHRONOUS_RESET.CODE;
    }
    else if (startupMessage & (1 << 7)) {
        msg = ANTMessage.prototype.NOTIFICATION.STARTUP.SUSPEND_RESET.MESSAGE;
        code = ANTMessage.prototype.NOTIFICATION.STARTUP.SUSPEND_RESET.CODE;
    }

    //this.emit(ANT.prototype.EVENT.LOG_MESSAGE, ANTMessage.prototype.ANT_MESSAGE.startup.friendly + " " + msg);

    this.message = { 'class' : 'Notifications', 'type' : 'Start-up Message', 'text': msg, 'code': code };
    
};

ANTMessage.prototype.parseNotificationSerialError = function (data) {
    var msg, code;

    var serialErrorMessage, faultMessage;


    if (typeof data === "undefined") {
        serialErrorMessage = this.content;
    }
    else
        serialErrorMessage = data;

    if (serialErrorMessage[0] === ANTMessage.prototype.NOTIFICATION.SERIAL_ERROR.FIRST_BYTE_NOT_SYNC.CODE) {
        msg = ANTMessage.prototype.NOTIFICATION.SERIAL_ERROR.FIRST_BYTE_NOT_SYNC.MESSAGE;
        code = ANTMessage.prototype.NOTIFICATION.SERIAL_ERROR.FIRST_BYTE_NOT_SYNC.CODE;
    }
    else if (serialErrorMessage[0] === ANTMessage.prototype.NOTIFICATION.SERIAL_ERROR.CRC_INCORRECT.CODE) {
        msg = ANTMessage.prototype.NOTIFICATION.SERIAL_ERROR.CRC_INCORRECT.MESSAGE;
        code = ANTMessage.prototype.NOTIFICATION.SERIAL_ERROR.CRC_INCORRECT.CODE;
    }
    else if (serialErrorMessage[0] === ANTMessage.prototype.NOTIFICATION.SERIAL_ERROR.MESSAGE_TOO_LARGE.CODE) {
        msg = ANTMessage.prototype.NOTIFICATION.SERIAL_ERROR.MESSAGE_TOO_LARGE.MESSAGE;
        code = ANTMessage.prototype.NOTIFICATION.SERIAL_ERROR.MESSAGE_TOO_LARGE.CODE;
        faultMessage = serialErrorMessage.slice(1);
    }

    //this.notificationSerialError = {
    //    timestamp: Date.now(),
    //    message: msg,
    //    code: code
    //};

    //this.emit(ANT.prototype.EVENT.LOG_MESSAGE, ANTMessage.prototype.ANT_MESSAGE.serial_error.friendly + " " + msg);
    //console.log("SERIAL ERROR ", msg);
    this.message = { 'class': 'Notifications', 'type': 'Serial Error Message', 'text': msg, 'code': code, 'faultMessage': faultMessage };
};


ANTMessage.prototype.parse = function () {

    switch (this.id) {

        // Notifications

        case ANTMessage.prototype.ANT_MESSAGE.startup.id:

            this.parseNotificationStartup();

            break;

        case ANTMessage.prototype.ANT_MESSAGE.serial_error.id:

            
            this.parseNotificationSerialError();

            break;

        default:

            console.log("Cannot parse message " + this.id);

            break;
    }
}

ANTMessage.prototype.toString = function () {
    return "ANT message:" +
        " SYNC 0x" + this.SYNC.toString(16) + " = "+this.SYNC +
        " length 0x" + this.length.toString(16) + " = "+this.length+
        " id 0x" + this.id.toString(16) + " = "+this.id+
        " content " + this.content + 
        " CRC 0x" + this.CRC.toString(16)+" = "+this.CRC;
}

/*
This function create a raw message 
// Message format
// SYNC MSG_LENGTH MSG_ID MSG_CONTENT (byte  0 - N -1) Checksum
// SYNC = 10100100 = 0xA4 or 10100101 (MSB:LSB)
// CheckSUM = XOR of all bytes in message
Content = Buffer
// Sending of LSB first = little endian NB!
*/
ANTMessage.prototype.create_message = function (message, content) {
    var 
     headerBuffer = new Buffer(3),
     contentBuffer,
     messageBuffer,
     trailingZeroBuffer,
     content_len,
     generatedMessage;

    // TEST 3 - provoke "ANT Message too large" content = new Buffer(200);

    if (content)
        content_len = content.length;
    else {
       // this.emit(ANT.prototype.EVENT.LOG_MESSAGE, "Content length is 0");
        content_len = 0;
    }

    //console.log("Message id. ", message.id, " Content is ", content);

    contentBuffer = new Buffer(content_len);
    //if (content_len > 8)
    //    console.warn("Content length of message is ", content_len);

    // Header
    // SYNC = 0; // -> Provoke Serial Error Message, error 0 - SYNC incorrect, should be 0xA4

    
    // TEST 1 error number 0 serial error - not SYNC
    //headerBuffer.writeUInt8(1, 0);

    headerBuffer.writeUInt8(ANTMessage.prototype.SYNC, 0);
    headerBuffer.writeUInt8(content_len, 1);
    headerBuffer.writeUInt8(message.id, 2);

    // Content
    for (var byteNr = 0; byteNr < content_len; byteNr++)
        contentBuffer.writeUInt8(content.readUInt8(byteNr), byteNr);

    messageBuffer = Buffer.concat([headerBuffer, contentBuffer], 3 + content_len);

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
    var checksum = this.getCRC(messageBuffer);

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


    generatedMessage = {
        id: message.id,
        buffer: messageBuffer,
        friendly: message.friendly
    };

   // console.log("Created message : ", generatedMessage)

    return generatedMessage;
};

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

// ANT message ID - from sec 9.3 ANT Message Summary ANT Message Protocol And Usage Rev 50
ANTMessage.prototype.ANT_MESSAGE = {

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

    // Device specific
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