/* global define: true, ArrayBuffer: true, Uint8Array: true */


if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    // Standard message :  bSYNC bLENGTH bID bCHANNELNUMBER CONTENT (8 bytes) bCRC (total length meta+content = 5+8 = 13 bytes)

    var LibConfig = require('./configuration/util/libConfig'),

        // Extended data if requested by libconfig

        ChannelId = require('./configuration/extended/channelId'),
        RSSI = require('./configuration/extended/RSSI'),
        RXTimestamp = require('./configuration/extended/RXTimestamp');

    function Message(data,id){

        this.timestamp = Date.now();
        this.data = data;

        // Extended data - channelID, RX timestamp and RSSI

        this.channelId = undefined;
        this.RXTimestamp = undefined;
        this.RSSI = undefined;

        if (data){
            Message.prototype.decode.call(this,data);
            this.decode(data);
          }

        if (typeof id !== 'undefined')
          this.id = id;

    }

    Message.prototype.SYNC = 0xA4; // Every raw ANT message starts with SYNC

    Message.prototype.FILLER_BYTE = 0x00;

    Message.prototype.HEADER_LENGTH = 3; // SYNC+LENGTH+ID

    Message.prototype.CRC_LENGTH = 1;

    Message.prototype.iSYNC = 0; // Index of sync byte within message
    Message.prototype.iLENGTH = 1;
    Message.prototype.iID = 2;

    Message.prototype.getName = function ()
    {
       return MESSAGE.prototype.MESSAGE[this.id];
    };

    Message.prototype.decode = function (data)
    {

        this.SYNC = data[Message.prototype.iSYNC];
        this.length = data[Message.prototype.iLENGTH];
        this.id = data[Message.prototype.iID];

        //this.content = new Uint8Array(data.buffer.slice(3, 3 + this.length)); // Easier to debug Uint8Array than ArrayBuffer
        this.content = data.subarray(Message.prototype.HEADER_LENGTH, Message.prototype.HEADER_LENGTH + this.length);
        //console.log("CONTENT", this.content);
        this.CRC = data[Message.prototype.HEADER_LENGTH + this.length];

        // Extended message

        // TO DO : Check Acknoledged Data and Advanced Burst Transfer data
        if ((this.id === Message.prototype.BROADCAST_DATA ||
             this.id === Message.prototype.BURST_TRANSFER_DATA) &&
             this.content.length > 9){

            this.flagsByte = this.content[9];
            //this.extendedData = new Uint8Array(this.content.buffer.slice(10));
            this.extendedData = this.content.subarray(10); // Subarray creates a view to underlying arraybuffer
            // Check for channel ID
            // p.37 spec: relative order of extended messages; channel ID, RSSI, timestamp (based on 32kHz clock, rolls over each 2 seconds)
            if (this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED){
                if (!this.channelId)
                    this.channelId = new ChannelId();
                //this.channelId.decode(this.extendedData.buffer.slice(0, 4));
                this.channelId.decode(this.extendedData.subarray(0, 4));

                // Spec. p. 27 - single master controls multiple slaves - possible to have a 1 or 2-byte shared address field at the start of data payload
                //            sharedAddress = this.channelId.getSharedAddressType();
                //
                //            if (sharedAddress === ChannelId.prototype.SHARED_ADDRESS_TYPE.ADDRESS_1BYTE)//{
                //                this.sharedAddress = this.content[0]; // 1 byte is the shared address 0 = broadcast to all slaves
                //                this.data = this.content.subarray(2, 9);
                //
                //            } else if (sharedAddress === ChannelId.prototype.SHARED_ADDRESS_TYPE.ADDRESS_2BYTE)//{
                //                this.sharedAddress = (new DataView(this.content,0,2)).getUint16(0,true); // 2-bytes LSB MSB shared address 0 = broadcast to all slaves
                //                this.data = this.content.subarray(3, 9);
                //            }
            }

            if (this.flagsByte & LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED){
                if (!this.RXTimestamp)
                    this.RXTimestamp = new RXTimestamp();
                // this.RXTimestamp.decode(this.extendedData.buffer.slice(-2));
                this.RXTimestamp.decode(this.extendedData.subarray(-2));
            }

            if (!(this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) && (this.flagsByte & LibConfig.prototype.Flag.RSSI_ENABLED)){
                //this.RSSI.decode(this.extendedData.buffer.slice(0, 2));
                if (!this.RSSI)
                    this.RSSI = new RSSI();
                this.RSSI.decode(this.extendedData.subarray(0, 2));
            }

            if ((this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED) && (this.flagsByte & LibConfig.prototype.Flag.RSSI_ENABLED)){
                //this.RSSI.decode(this.extendedData.buffer.slice(4, 7));
                if (!this.RSSI)
                    this.RSSI = new RSSI();
                this.RSSI.decode(this.extendedData.subarray(4, 7));
            }
        }
    };

    Message.prototype.toString = function (verbose){

      var msg = Message.prototype.MESSAGE[this.id];

      if (!verbose)
        return msg;

      if (this.SYNC)
         msg += " SYNC 0x" + this.SYNC.toString(16) + " = "+this.SYNC;

      if (this.length)
        msg +=  " LEN 0x" + this.length.toString(16) + " = "+this.length;

      if (this.id)
        msg +=  " ID 0x" + this.id.toString(16) + " = "+this.id;

    //  if (this.content)
    //    msg += " content " + this.content.toString();

      if (this.CRC)
        msg += " CRC 0x" + this.CRC.toString(16)+" = "+this.CRC;

        return msg;

      };

    Message.prototype.getContent = function (){
        return this.content;
    };

    Message.prototype.setContent = function (content){
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
    Message.prototype.getRawMessage = function (){
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
            console.log("Message: content length is undefined, check .byteLength property");

        //console.log("Message id. ", message.id, " Content is ", content);

        //contentBuffer = new Buffer(content_len);
        //if (content_len > 8)
        //    console.warn("Content length of message is ", content_len);

        // Header
        // SYNC = 0; // -> Provoke Serial Error Message, error 0 - SYNC incorrect, should be 0xA4


        // TEST 1 error number 0 serial error - not SYNC
        //headerBuffer.writeUInt8(1, 0);

    //    headerBuffer.writeUInt8(Message.prototype.SYNC, 0);
    //    headerBuffer.writeUInt8(content_len, 1);
    //    headerBuffer.writeUInt8(this.id, 2);

        standardMessage[0] = Message.prototype.SYNC;
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
        //for (byteNr = 1; byteNr < messageBuffer.length; byteNr++)//{
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

    //    if (content_len < 8)//{
    //        trailingZeroBuffer = this.getPadZeroBuffer(8 - content_len - 1);
    //        //trailingZeroBuffer = new Buffer(8 - content_len - 1); // CRC included in payload
    //        //for (byteNr = 0; byteNr < 8 - content_len - 1; byteNr++)
    //        //    trailingZeroBuffer.writeUInt8(0, byteNr);
    //
    //        this.buffer = Buffer.concat([this.buffer, trailingZeroBuffer]);
    //    }


        //this.SYNC = Message.prototype.SYNC;
        this.length = content_len;
    //
    //    console.trace();
    //    console.log("Standard msg",standardMessage);
        this.buffer = standardMessage.buffer; // Arraybuffer
        this.standardMessage = standardMessage;

        return this.standardMessage;

    };

    // CheckSUM = XOR of all bytes in message
    Message.prototype.getCRC = function (messageBuffer){
        //console.log("GET CRC",messageBuffer);
        var checksum = messageBuffer[0], // Should be SYNC 0xA4
            len = messageBuffer[1] + Message.prototype.HEADER_LENGTH, // Should be messageBuffer.length - 1
            byteNr;
        // console.trace();
       // console.log("Start checksum", checksum.toString(16), "RAW",messageBuffer,"length",len,"messageBuffer.length",messageBuffer.length);

        for (byteNr = 1; byteNr < len; byteNr++){
            checksum = checksum ^ messageBuffer[byteNr];
         //   console.log("Checksum", checksum, "byte nr", byteNr, "value:", messageBuffer[byteNr]);
        }

        return checksum;
    };

    Message.prototype.getMessageId = function ()
    {
        return this.id;
    };

    // ANT message ID - from sec 9.3 ANT Message Summary ANT Message Protocol And Usage Rev 50

    Message.prototype.RESET_SYSTEM = 0x4A;
    Message.prototype.OPEN_CHANNEL =  0x4B;
    Message.prototype.CLOSE_CHANNEL =  0x4C;
    Message.prototype.OPEN_RX_SCAN_MODE = 0x5B;
    Message.prototype.SLEEP_MESSAGE = 0xC5;
    Message.prototype.NOTIFICATION_STARTUP = 0x6F;
    Message.prototype.NOTIFICATION_SERIAL_ERROR = 0xAE;
    Message.prototype.ANT_VERSION =  0x3E;
    Message.prototype.CAPABILITIES =  0x54;
    Message.prototype.DEVICE_SERIAL_NUMBER =  0x61;
    Message.prototype.EVENT_BUFFER_CONFIGURATION = 0x74;
    Message.prototype.REQUEST = 0x4D;
    Message.prototype.CHANNEL_RESPONSE =  0x40;
    Message.prototype.CHANNEL_STATUS = 0x52;
    Message.prototype.UNASSIGN_CHANNEL = 0x41;
    Message.prototype.ASSIGN_CHANNEL = 0x42;
    Message.prototype.SET_CHANNEL_ID = 0x51;
    Message.prototype.SET_CHANNEL_PERIOD =  0x43;
    Message.prototype.SET_CHANNEL_SEARCH_TIMEOUT =  0x44;
    Message.prototype.SET_CHANNEL_RFFREQ =  0x45;
    Message.prototype.SET_NETWORK_KEY = 0x46;
    Message.prototype.SET_TRANSMIT_POWER = 0x47;
    Message.prototype.SET_SEARCH_WAVEFORM = 0x49;
    Message.prototype.SET_CHANNEL_TX_POWER = 0x60;
    Message.prototype.SET_LOW_PRIORITY_CHANNEL_SEARCH_TIMEOUT =  0x63;
    Message.prototype.SET_SERIAL_NUM_CHANNEL_ID = 0x65;
    Message.prototype.RXEXTMESGSENABLE = 0x66;
    Message.prototype.LIBCONFIG =  0x6E;
    Message.prototype.SET_PROXIMITY_SEARCH = 0x71;
    Message.prototype.SET_CHANNEL_SEARCH_PRIORITY =  0x75;
    Message.prototype.BROADCAST_DATA =  0x4E;
    Message.prototype.ACKNOWLEDGED_DATA =  0x4F;
    Message.prototype.BURST_TRANSFER_DATA = 0x50;
    Message.prototype.ADVANCED_BURST_TRANSFER_DATA =  0x72;

    Message.prototype.MESSAGE = {

            // Control messages

            0x4A: "Reset system",

            0x4B: "Open channel",

            0x4C: "Close channel",

            0x5B: "Open RX scan mode",

            0xC5: "Sleep message",

            // Notification messages

            0x6F: "Notification: Start up",

            0xAE: "Notification: Serial error",

            // Requested messages with REQUEST 0x4D

            0x3E : "ANT Version",

            0x54: "Capabilities",

            0x61: "Device Serial Number",

            0x74: "Event Buffer Configuration",

            // Request/response

            0x4D: "Request",

            0x40: "Response/RF event",

            0x52: "Channel Status",

            // Config messages. All conf. commands receive a response, typically "RESPONSE_NO_ERROR"

            0x41: "UnAssign Channel",

            0x42 : "Assign Channel",

            0x51: "Set Channel ID",

            0x43: "Set channel period (Tch)",

            0x44: "High priority (HP) search timeout",

            0x45: "Channel RF frequency",

            0x46: "Set network key",

            0x47: "Set transmit power",

            0x49: "Search waveform",

            0x60: "Set Channel Tx Power",

            0x63: "Low priority (LP) search timeout",

            0x65: "Set Serial Num Channel ID",

            0x66: "Enable Extended Messages",

            0x6E: "Lib Config",

            0x71: "Set Proximity Search",

            0x75: "Channel Search Priority",

            // Data messages

            0x4E: "Broadcast Data",

            0x4F: "Acknowledged Data",

            0x50: "Burst Transfer Data",

            0x72: "Advanced Burst Transfer Data",

    };

    module.exports = Message;
    return module.exports;
});
