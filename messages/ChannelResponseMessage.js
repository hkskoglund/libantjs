/* global define: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
"use strict";
var ANTMessage = require('messages/ANTMessage');

function ChannelResponseMessage(data) {

    ANTMessage.call(this,data);

    this.id = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE;
    this.name = "Channel Response/RF event";
    this.type = ANTMessage.prototype.TYPE.RESPONSE;
    
    if (data)
      this.parse();
    

    //console.log("ChannelResponseMessage", this);

}

ChannelResponseMessage.prototype = Object.create(ANTMessage.prototype);

ChannelResponseMessage.prototype.constructor = ChannelResponseMessage;

ChannelResponseMessage.prototype.RESPONSE_EVENT_CODES = {

    RESPONSE_NO_ERROR: 0x00,
    0x00:  "RESPONSE_NO_ERROR",

    EVENT_RX_SEARCH_TIMEOUT: 0x01,
    0x01: "EVENT_RX_SEARCH_TIMEOUT", //  "The search is terminated, and the channel has been automatically closed." 

    EVENT_RX_FAIL: 0x02,
    0x02:  "EVENT_RX_FAIL" ,

    EVENT_TX: 0x03,
    0x03: "EVENT_TX",

    EVENT_TRANSFER_RX_FAILED: 0x04,
    0x04: "EVENT_TRANSFER_RX_FAILED",

    EVENT_TRANSFER_TX_COMPLETED: 0x05,
    0x05: "EVENT_TRANSFER_TX_COMPLETED",

    EVENT_TRANSFER_TX_FAILED: 0x06,
    0x06: "EVENT_TRANSFER_TX_FAILED" ,

    EVENT_CHANNEL_CLOSED: 0x07,
    0x07: "EVENT_CHANNEL_CLOSED",

    EVENT_RX_FAIL_GO_TO_SEARCH: 0x08,
    0x08: "EVENT_RX_FAIL_GO_TO_SEARCH" ,

    EVENT_CHANNEL_COLLISION: 0x09,
    0x09: "EVENT_CHANNEL_COLLISION",

    EVENT_TRANSFER_TX_START: 0x0A,
    0x0A: "EVENT_TRANSFER_TX_START",

    // Found in antdefines.h of ANT-FS PC Tools SDK (ANTFS_PC_Tools_src\antfs_pc_tools_src_v1.3.0\ANTFSHostDemo\ANT_LIB\inc), not mentioned in rev 5.0b ANT Message Protocol and Usage
    // Seen on testing multiple retries of assign channel command nRF24AP2 USB
    EVENT_CHANNEL_ACTIVE: 0x0F,
    0x0F : "EVENT_CHANNEL_ACTIVE",

    EVENT_TRANSFER_NEXT_DATA_BLOCK: 0x11,
    0x11 :"EVENT_TRANSFER_NEXT_DATA_BLOCK",

    CHANNEL_IN_WRONG_STATE: 0x15,
    0x15: "CHANNEL_IN_WRONG_STATE",

    CHANNEL_NOT_OPENED: 0x16,
    0x16: "CHANNEL_NOT_OPENED",

    CHANNEL_ID_NOT_SET: 0x18,
    0x18: "CHANNEL_ID_NOT_SET",

    CLOSE_ALL_CHANNELS: 0x19,
    0x19: "CLOSE_ALL_CHANNELS",

    TRANSFER_IN_PROGRESS: 0x1F,
    0x1F: "TRANSFER_IN_PROGRESS",

    TRANSFER_SEQUENCE_NUMBER_ERROR: 0x20,
    0x20: "TRANSFER_SEQUENCE_NUMBER_ERROR" ,

    TRANSFER_IN_ERROR: 0x21,
    0x21: "TRANSFER_IN_ERROR" ,

    MESSAGE_SIZE_EXCEEDS_LIMIT: 0x27,
    0x27:  "MESSAGE_SIZE_EXCEEDS_LIMIT" ,

    INVALID_MESSAGE: 0x28,
    0x28: "INVALID_MESSAGE",

    INVALID_NETWORK_NUMBER: 0x29,
    0x29:  "INVALID_NETWORK_NUMBER" ,

    INVALID_LIST_ID: 0x30,
    0x30:  "INVALID_LIST_ID" ,

    INVALID_SCAN_TX_CHANNEL: 0x31,
    0x31:  "INVALID_SCAN_TX_CHANNEL" ,

    INVALID_PARAMETER_PROVIDED: 0x33,
    0x33: "INVALID_PARAMETER_PROVIDED" ,

    EVENT_SERIAL_QUEUE_OVERFLOW: 0x34,
    0x34: "EVENT_SERIAL_QUEUE_OVERFLOW" ,

    EVENT_QUEUE_OVERFLOW: 0x35,
    0x35:  "EVENT_QUEUE_OVERFLOW" ,

    NVM_FULL_ERROR: 0x40,
    0x40:  "NVM_FULL_ERROR" ,

    NVM_WRITE_ERROR: 0x41,
    0x41:  "NVM_WRITE_ERROR",

    USB_STRING_WRITE_FAIL: 0x70,
    0x70: "USB_STRING_WRITE_FAIL",

    MESG_SERIAL_ERROR_ID: 0xAE,
    0xAE: "MESG_SERIAL_ERROR_ID" ,

    ENCRYPT_NEGOTIATION_SUCCESS: 0x38,
    0x38:  "ENCRYPT_NEGOTIATION_SUCCESS" ,

    ENCRYPT_NEGOTIATION_FAIL: 0x39,
    0x39:  "ENCRYPT_NEGOTIATION_FAIL" ,
};

ChannelResponseMessage.prototype.getResponseOrEventMessage = function (messageId) {
    if (typeof messageId === "undefined")
        return ChannelResponseMessage.prototype.RESPONSE_EVENT_CODES[this.content[2]];
    else
        return ChannelResponseMessage.prototype.RESPONSE_EVENT_CODES[messageId];
};

ChannelResponseMessage.prototype.getChannel = function () {
    return this.content[0];
};

// Gets the initiating request message id
ChannelResponseMessage.prototype.getRequestMessageId = function () {
    return this.content[1];
};

ChannelResponseMessage.prototype.getMessageCode = function () {
    return this.content[2];
};

ChannelResponseMessage.prototype.isRFEvent = function () {
    return (this.content[1] === 1);
};


ChannelResponseMessage.prototype.parse = function (data) {
    var msg;

    if (data)
        this.mainParse(data);

    this.channel = this.content[0];
    this.initiatingId = this.content[1];
    this.responseCode = this.content[2];
    this.RFEvent = (this.content[1] === 1);
    this.responseEvent = this.getResponseOrEventMessage();

    if (this.RFEvent) // Set to 1 for RF event
        msg = "RF EVENT C# " + this.channel + " " + this.responseEvent + " ";
    else
        msg = "RESPONSE C# " + this.channel + " to ID# 0x" + this.initiatingId.toString(16) + " " + ANTMessage.prototype.MESSAGE[this.initiatingId] + " " + this.responseEvent;

    this.message = msg;
    
};

ChannelResponseMessage.prototype.toString = function () {
    return this.name + " ID# 0x" + this.id.toString(16) + " "+this.message;
};

module.exports = ChannelResponseMessage;
    return module.exports;
});
