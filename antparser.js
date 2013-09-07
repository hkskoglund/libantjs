var Transform = require('stream').Transform,
    util = require('util'),
    ANTMessage = require('./messages/ANTMessage.js'),

    // Notifications from ANT

    NotificationStartup = require('./messages/from/NotificationStartup.js'),
    NotificationSerialError = require('./messages/from/NotificationSerialError.js'),

     CapabilitiesMessage = require('./messages/from/CapabilitiesMessage.js'),
     ChannelIdMessage = require('./messages/from/ChannelIdMessage.js'),
    ANTVersionMessage = require('./messages/from/ANTVersionMessage.js'),
    DeviceSerialNumberMessage = require('./messages/from/DeviceSerialNumberMessage.js'),
     ChannelStatusMessage = require('./messages/from/ChannelStatusMessage.js'),

     ChannelResponseMessage = require('./messages/from/ChannelResponseMessage.js'),

// Data

     BroadcastDataMessage = require('./messages/from/BroadcastDataMessage.js');

function ParseANTResponse(options) {
    //if (!(this instanceof ParseANTResponse))
    //    return new ParseANTResponse({ objectMode: true });

    if (!options)
      Transform.call(this, { objectMode: true });
    else
      Transform.call(this, options);

    this.on(ParseANTResponse.prototype.EVENT.LOG, this.showLog);

   

}

util.inherits(ParseANTResponse, Transform);

// for event emitter
ParseANTResponse.prototype.EVENT = {

    //// Notifications
    NOTIFICATION_STARTUP: 'notificationStartup',
    NOTIFICATION_SERIAL_ERROR: 'notificationSerialError',

    CHANNEL_STATUS: 'channelStatus',
    CHANNEL_RESPONSE_RF_EVENT: 'channelResponseRFEvent',

    //REPLY : 'reply',

    LOG: 'log',
    ERROR: 'error',

    CHANNEL_ID: 'channelId',
    DEVICE_SERIAL_NUMBER: 'deviceSerialNumber',
    ANT_VERSION: 'ANTVersion',
    CAPABILITIES: 'deviceCapabilities',

    // Data
    BROADCAST: 'broadcast',
    BURST: 'burst',

};

ParseANTResponse.prototype.showLog = function (msg) {
    console.log(Date.now(), msg);
};


// Overview on p. 58 - ANT Message Protocol and Usage
ParseANTResponse.prototype.parse = function (data) {
    //console.time('parse');
   
    var notification;
   
    var ANTmsg = {
        SYNC: data[0],
        length: data[1],
        id: data[2]
    };

    //var ANTmsg = new ANTMessage();
    //ANTmsg.setMessage(data, true);
    //if (ANTmsg.message)
    //  this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, ANTmsg.message.text);

    var OFFSET_CONTENT = 3,
        OFFSET_LENGTH = 1,

        antInstance = this,
       // self = this,
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
    //    this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, " Invalid SYNC byte "+ firstSYNC+ " expected "+ ANTMessage.prototype.SYNC+" cannot trust the integrety of data, thus discarding bytes:"+ data.length);
    //    return;
    //}

    //// Check CRC

    //if (!CRCOK) {
    //    console.log("CRC failure - allow passthrough");
    //    //this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "CRC failure - verified CRC " + verifiedCRC.toString(16) + " message CRC" + msgCRC.toString(16));
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
        //                antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "No listener for event Channel.prototype.EVENT.BURST on channel " + ANTmsg.channel);
        //            else
        //                antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Burst data received " + antInstance.channelConfiguration[ANTmsg.channel].burstData.length + " bytes time " + diff + " ms rate " + (antInstance.channelConfiguration[ANTmsg.channel].burstData.length / (diff / 1000)).toFixed(1) + " bytes/sec");

        //            //antInstance.channelConfiguration[channelNr].parseBurstData(antInstance.channelConfiguration[channelNr].burstData, burstParser);
        //        }
        //    }
        //    else {
        //        console.trace();
        //        console.log("Data", data);
        //        antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Cannot handle this message of "+ANTmsg.length+ " bytes. Expecting a message length of 9 for standard messages or greater for extended messages (channel ID/RSSI/RX timestamp)");
        //    }

        //    break;

        case ANTMessage.prototype.MESSAGE.BROADCAST_DATA:

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
        //                this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Failed to get updated channel ID");
        //            },
        //           function success(data) {
        //               antInstance.channelConfiguration[channelNr].hasUpdatedChannelID = true;
        //           });

        //    }

        //    // Call to broadcast handler for channel
        //    if (!antInstance.channelConfiguration[channelNr].emit(Channel.prototype.EVENT.BROADCAST, data))
        //        antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE,"No listener for event Channel.prototype.EVENT.BROADCAST on channel "+channelNr);

            //    //antInstance.channelConfiguration[channelNr].broadCastDataParser(data);

            // Example RX broadcast standard message : <Buffer a4 09 4e 01 84 00 5a 64 79 66 40 93 94>
           
            this.broadcast = new BroadcastDataMessage(); 

            this.broadcast.parse(data.slice(3,3+ANTmsg.length));

            // console.log(Date.now(),this.broadcast.toString(), "Payload",this.broadcast.data);

            // Question ? Filtering of identical messages should it be done here or delayed to i.e device profile ??
            // The number of function calls can be limited if filtering is done here....

            if(!this.emit(ParseANTResponse.prototype.EVENT.BROADCAST, this.broadcast))
              this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + this.broadcast.toString());

            break;

        // Notifications from ANT engine

        case ANTMessage.prototype.MESSAGE.NOTIFICATION_STARTUP:

            notification = new NotificationStartup(data);
           
            if (!this.emit(ParseANTResponse.prototype.EVENT.NOTIFICATION_STARTUP, notification))
              this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: "+notification.toString());

            break;

        case ANTMessage.prototype.MESSAGE.NOTIFICATION_SERIAL_ERROR:

            notification = new NotificationSerialError(data);

            if (!this.emit(ParseANTResponse.prototype.EVENT.NOTIFICATION_SERIAL_ERROR,notification))
                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: "+notification.toString());

            break;

            // Channel event or responses

        case ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE:

            //var channelResponseMessage = antInstance.parseChannelResponse(data);

            //this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, channelResponseMessage);


            //msgStr += ANTMessage.prototype.MESSAGE.channel_response.friendly + " " + channelResponseMessage;
            //channelNr = data[3];

            //// Handle retry of acknowledged data
            //if (antInstance.isEvent(ParseANTResponse.prototype.RESPONSE_EVENT_CODES.EVENT_TRANSFER_TX_COMPLETED, data)) {

            //    if (antInstance.retryQueue[channelNr].length >= 1) {
            //        resendMsg = antInstance.retryQueue[channelNr].shift();
            //        clearTimeout(resendMsg.timeoutID); // No need to call timeout callback now
            //        if (typeof resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB === "function")
            //            resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB();
            //        else
            //            this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, " No transfer complete callback specified after acknowledged data");
            //        //console.log(Date.now() + " TRANSFER COMPLETE - removing from retry-queue",resendMsg);
            //    }

            //    if (antInstance.burstQueue[channelNr].length >= 1) {
            //        resendMsg = antInstance.burstQueue[channelNr].shift();
            //        if (typeof resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB === "function")
            //            resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB();
            //        else
            //            antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, " No transfer complete callback specified after burst");
            //    }

            //} else if (antInstance.isEvent(ParseANTResponse.prototype.RESPONSE_EVENT_CODES.EVENT_TRANSFER_TX_FAILED, data)) {
            //    if (antInstance.retryQueue[channelNr].length >= 1) {
            //        resendMsg = antInstance.retryQueue[channelNr][0];
            //        this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Re-sending ACKNOWLEDGE message due to TX_FAILED, retry " + resendMsg.retry);
            //        resendMsg.retryCB();
            //    }

            //    if (antInstance.burstQueue[channelNr].length >= 1) {
            //        burstMsg = antInstance.burstQueue[channelNr][0];
            //        this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Re-sending BURST message due to TX_FAILED " + burstMsg.message.friendlyName + " retry " + burstMsg.retry);
            //        burstMsg.retryCB();
            //    }
            //}

            //// Call channel event/response-handler for each channel

            //// OLD-way of calling callback antInstance.channelConfiguration[channelNr].channelResponseEvent(data);

            //// console.log("Channel response/EVENT", channelNr, channelResponseMessage,antInstance.channelConfiguration[channelNr]);
            //antInstance.channelConfiguration[channelNr].emit(Channel.prototype.EVENT.CHANNEL_RESPONSE_EVENT, data, channelResponseMessage);

            var channelResponseMsg = new ChannelResponseMessage();
            //TEST provoking EVENT_CHANNEL_ACTIVE
            //data[5] = 0xF;
            channelResponseMsg.setContent(data.slice(3, 3 + ANTmsg.length));
            channelResponseMsg.parse();

            // It could be possible to make the emit event more specific by f.ex adding channel nr. + initiating message id., but maybe not necessary
            //if (!this.emit(ParseANTResponse.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, channelResponseMsg))
            //    this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + channelResponse.toString());

           // var type = channelResponseMsg.getResponseOrEventMessage();

            //console.log("event type", type);

            if (!this.emit(ParseANTResponse.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, channelResponseMsg, channelResponseMsg.getChannel(), channelResponseMsg.getRequestMessageId(), channelResponseMsg.getMessageCode())) {
                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + ParseANTResponse.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT);
                console.log("resp", channelResponseMsg);
            }
            //this.emit(type, channelResponseMsg, channelResponseMsg.getChannel(), channelResponseMsg.getRequestMessageId(), channelResponseMsg.getMessageCode());
            //    this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + type);
            //this.emit(ParseANTResponse.prototype.EVENT.LOG, channelResponseMsg.toString());

            break;

            // Response messages to request 

            // Channel specific 

        case ANTMessage.prototype.MESSAGE.CHANNEL_STATUS:
            //if (!antInstance.emit(ParseANTResponse.prototype.EVENT.CHANNEL_STATUS, data))
            //    antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "No listener for event ParseANTResponse.prototype.EVENT.CHANNEL_STATUS");

            var channelStatusMsg = new ChannelStatusMessage();
            channelStatusMsg.setContent(data.slice(3, 3 + ANTmsg.length));
            channelStatusMsg.parse();
            //console.log("status", channelStatusMsg);

            if (!this.emit(ParseANTResponse.prototype.EVENT.CHANNEL_STATUS, channelStatusMsg))
                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + channelStatus.toString());

            break;

        case ANTMessage.prototype.MESSAGE.CHANNEL_ID:

            var channelIdMsg = new ChannelIdMessage();
            channelIdMsg.setContent(data.slice(3, 3 + ANTmsg.length));
            channelIdMsg.parse();

            console.log("Got response channel ID", channelIdMsg.toString());

            if (!this.emit(ParseANTResponse.prototype.EVENT.CHANNEL_ID, channelIdMsg))
                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + channelIdMsg.toString());

            //if (!antInstance.emit(ParseANTResponse.prototype.EVENT.SET_CHANNEL_ID, data))
            //    antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "No listener for event ParseANTResponse.prototype.EVENT.SET_CHANNEL_ID");
            break;

            // ANT device specific, i.e nRF24AP2

        case ANTMessage.prototype.MESSAGE.ANT_VERSION:

            var versionMsg = new ANTVersionMessage();
            versionMsg.setContent(data.slice(3, 3 + ANTmsg.length));
            versionMsg.parse();

            if (!this.emit(ParseANTResponse.prototype.EVENT.ANT_VERSION, versionMsg))
                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + versionMsg.toString());

            break;

        case ANTMessage.prototype.MESSAGE.CAPABILITIES:

            var capabilitiesMsg = new CapabilitiesMessage();
            capabilitiesMsg.setContent(data.slice(3, 3 + ANTmsg.length));
            capabilitiesMsg.parse();

            if (!this.emit(ParseANTResponse.prototype.EVENT.CAPABILITIES, capabilitiesMsg))
                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + capabilitiesMsg.toString());

            break;

        case ANTMessage.prototype.MESSAGE.DEVICE_SERIAL_NUMBER:
           
            var serialNumberMsg = new DeviceSerialNumberMessage();
            serialNumberMsg.setContent(data.slice(3, 3 + ANTmsg.length));
            serialNumberMsg.parse();

            if (!this.emit(ParseANTResponse.prototype.EVENT.DEVICE_SERIAL_NUMBER, serialNumberMsg))
                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + serialNumberMsg.toString());

            break;

        default:
            //msgStr += "* NO parser specified *";
            antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Unable to parse received data");
            break;
    }

    // There might be more buffered data messages from ANT engine available (if commands/request are sent, but not read in awhile)

    var nextExpectedSYNCIndex = 1 + ANTmsg.length + 2 + 1;
    if (data.length > nextExpectedSYNCIndex) {
        // console.log(data.slice(nextExpectedSYNCIndex));
        this.parse(data.slice(nextExpectedSYNCIndex));
    }

};

ParseANTResponse.prototype._transform = function (response, encoding, nextCB) {
    this.parse(response);
    //console.log("Need more data", this.push(response),"Highwatermark", this._readableState.highWaterMark, this._readableState.buffer.length);
    nextCB();
}

module.exports = ParseANTResponse;
