var Transform = require('stream').Transform,
    util = require('util'),
    ANTMessage = require('./messages/ANTMessage.js'),

    // Notifications from ANT

    NotificationStartup = require('./messages/NotificationStartup.js'),
    NotificationSerialError = require('./messages/NotificationSerialError.js'),

     CapabilitiesMessage = require('./messages/CapabilitiesMessage.js'),
    ANTVersionMessage = require('./messages/ANTVersionMessage.js');

util.inherits(ParseANTResponse, Transform);

function ParseANTResponse(options) {
    Transform.call(this, options);

    this.on(ParseANTResponse.prototype.EVENT.LOG, this.showLog);
}

// for event emitter
ParseANTResponse.prototype.EVENT = {

    //// Notifications
    //STARTUP: 'notificationStartup',
    //SERIAL_ERROR: 'notificationSerialError',

    //CHANNEL_STATUS: 'channelStatus',

    REPLY : 'reply',

    LOG: 'log',
    ERROR: 'error',

    //SET_CHANNEL_ID: 'setChannelId',

    //DEVICE_SERIAL_NUMBER: 'deviceSerialNumber',
    //ANT_VERSION: 'ANTVersion',
    //CAPABILITIES: 'deviceCapabilities',

    // Data
    BROADCAST: 'broadcast',
    BURST: 'burst',

    CHANNEL_RESPONSE_EVENT: 'channelResponseEvent',

};

ParseANTResponse.prototype.showLog = function (msg)
{
   
    console.log(Date.now(),msg);
}


// Overview on p. 58 - ANT Message Protocol and Usage
ParseANTResponse.prototype.parse_response = function (data) {
   
    var ANTmsg = {
        SYNC: data[0],
        length: data[1],
        id: data[2]
    };

    //var ANTmsg = new ANTMessage();
    //ANTmsg.setMessage(data, true);
    //if (ANTmsg.message)
    //  this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, ANTmsg.message.text);

    var antInstance = this,
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

        //    break;

        // Notifications from ANT engine

        case ANTMessage.prototype.MESSAGE.NOTIFICATION_STARTUP:

            var notification = new NotificationStartup(data);
           
            if (!this.emit(ParseANTResponse.prototype.EVENT.REPLY, notification))
              this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: "+notification.toString());

            break;

        case ANTMessage.prototype.MESSAGE.NOTIFICATION_SERIAL_ERROR:

            var notification = new NotificationSerialError(data);

            if (!this.emit(ParseANTResponse.prototype.EVENT.REPLY,notification))
                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: "+notification.toString());

            break;

            // Channel event or responses

        case ANTMessage.prototype.MESSAGE.channel_response.id:

            var channelResponseMessage = antInstance.parseChannelResponse(data);

            this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, channelResponseMessage);


            msgStr += ANTMessage.prototype.MESSAGE.channel_response.friendly + " " + channelResponseMessage;
            channelNr = data[3];

            // Handle retry of acknowledged data
            if (antInstance.isEvent(ParseANTResponse.prototype.RESPONSE_EVENT_CODES.EVENT_TRANSFER_TX_COMPLETED, data)) {

                if (antInstance.retryQueue[channelNr].length >= 1) {
                    resendMsg = antInstance.retryQueue[channelNr].shift();
                    clearTimeout(resendMsg.timeoutID); // No need to call timeout callback now
                    if (typeof resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB === "function")
                        resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB();
                    else
                        this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, " No transfer complete callback specified after acknowledged data");
                    //console.log(Date.now() + " TRANSFER COMPLETE - removing from retry-queue",resendMsg);
                }

                if (antInstance.burstQueue[channelNr].length >= 1) {
                    resendMsg = antInstance.burstQueue[channelNr].shift();
                    if (typeof resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB === "function")
                        resendMsg.EVENT_TRANSFER_TX_COMPLETED_CB();
                    else
                        antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, " No transfer complete callback specified after burst");
                }

            } else if (antInstance.isEvent(ParseANTResponse.prototype.RESPONSE_EVENT_CODES.EVENT_TRANSFER_TX_FAILED, data)) {
                if (antInstance.retryQueue[channelNr].length >= 1) {
                    resendMsg = antInstance.retryQueue[channelNr][0];
                    this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Re-sending ACKNOWLEDGE message due to TX_FAILED, retry " + resendMsg.retry);
                    resendMsg.retryCB();
                }

                if (antInstance.burstQueue[channelNr].length >= 1) {
                    burstMsg = antInstance.burstQueue[channelNr][0];
                    this.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "Re-sending BURST message due to TX_FAILED " + burstMsg.message.friendlyName + " retry " + burstMsg.retry);
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
            if (!antInstance.emit(ParseANTResponse.prototype.EVENT.CHANNEL_STATUS, data))
                antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "No listener for event ParseANTResponse.prototype.EVENT.CHANNEL_STATUS");

            break;

        case ANTMessage.prototype.MESSAGE.set_channel_id.id:
            if (!antInstance.emit(ParseANTResponse.prototype.EVENT.SET_CHANNEL_ID, data))
                antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "No listener for event ParseANTResponse.prototype.EVENT.SET_CHANNEL_ID");
            break;

            // ANT device specific, i.e nRF24AP2

        case ANTMessage.prototype.MESSAGE.ANT_VERSION:

            var version = new ANTVersionMessage(data);

            if (!this.emit(ParseANTResponse.prototype.EVENT.REPLY, version))
                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + version.toString());

            break;

        case ANTMessage.prototype.MESSAGE.CAPABILITIES:

            var capabilities = new CapabilitiesMessage(data);

            if (!this.emit(ParseANTResponse.prototype.EVENT.REPLY, capabilities))
                this.emit(ParseANTResponse.prototype.EVENT.LOG, "No listener for: " + capabilities.toString());

            break;

        case ANTMessage.prototype.MESSAGE.device_serial_number.id:
            if (!antInstance.emit(ParseANTResponse.prototype.EVENT.DEVICE_SERIAL_NUMBER, data))
                antInstance.emit(ParseANTResponse.prototype.EVENT.LOG_MESSAGE, "No listener for event ParseANTResponse.prototype.EVENT.DEVICE_SERIAL_NUMBER");

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
        this.parse_response(data.slice(nextExpectedSYNCIndex));
    }

};

ParseANTResponse.prototype._transform = function (chunk, encoding, nextCB) {
    this.parse_response(chunk);
    this.push(chunk); // Allows for more pipes
    nextCB();
}

module.exports = ParseANTResponse;
