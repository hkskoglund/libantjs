/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('../messages/Message');

    function ChannelResponse(channel,initiatingId,code)
    {
      this.channel = channel;
      this.initiatingId = initiatingId;
      this.code  = code;

    }

    ChannelResponse.prototype.RESPONSE_NO_ERROR = 0x00;
    ChannelResponse.prototype.EVENT_RX_SEARCH_TIMEOUT = 0x01;
    ChannelResponse.prototype.EVENT_RX_FAIL = 0x02;
    ChannelResponse.prototype.EVENT_TX = 0x03;
    ChannelResponse.prototype.EVENT_TRANSFER_RX_FAILED = 0x04;
    ChannelResponse.prototype.EVENT_TRANSFER_TX_COMPLETED= 0x05;
    ChannelResponse.prototype.EVENT_TRANSFER_TX_FAILED= 0x06;
    ChannelResponse.prototype.EVENT_CHANNEL_CLOSED= 0x07;
    ChannelResponse.prototype.EVENT_RX_FAIL_GO_TO_SEARCH= 0x08;
    ChannelResponse.prototype.EVENT_CHANNEL_COLLISION= 0x09;
    ChannelResponse.prototype.EVENT_TRANSFER_TX_START= 0x0A;
    // Found in antdefines.h of ANT-FS PC Tools SDK (ANTFS_PC_Tools_src\antfs_pc_tools_src_v1.3.0\ANTFSHostDemo\ANT_LIB\inc), not mentioned in rev 5.0b ANT Message Protocol and Usage
    // Seen on testing multiple retries of assign channel command nRF24AP2 USB
    ChannelResponse.prototype.EVENT_CHANNEL_ACTIVE= 0x0F;
    ChannelResponse.prototype.EVENT_TRANSFER_NEXT_DATA_BLOCK= 0x11;
    ChannelResponse.prototype.CHANNEL_IN_WRONG_STATE= 0x15;
    ChannelResponse.prototype.CHANNEL_NOT_OPENED= 0x16;
    ChannelResponse.prototype.CHANNEL_ID_NOT_SET= 0x18;
    ChannelResponse.prototype.CLOSE_ALL_CHANNELS= 0x19;
    ChannelResponse.prototype.TRANSFER_IN_PROGRESS= 0x1F;
    ChannelResponse.prototype.TRANSFER_SEQUENCE_NUMBER_ERROR= 0x20;
    ChannelResponse.prototype.TRANSFER_IN_ERROR= 0x21;
    ChannelResponse.prototype.MESSAGE_SIZE_EXCEEDS_LIMIT= 0x27;
    ChannelResponse.prototype.INVALID_MESSAGE = 0x28;
    ChannelResponse.prototype.INVALID_NETWORK_NUMBER = 0x29;
    ChannelResponse.prototype.INVALID_LIST_ID = 0x30;
    ChannelResponse.prototype.INVALID_SCAN_TX_CHANNEL = 0x31;
    ChannelResponse.prototype.INVALID_PARAMETER_PROVIDED = 0x33;
    ChannelResponse.prototype.EVENT_SERIAL_QUEUE_OVERFLOW = 0x34;
    ChannelResponse.prototype.EVENT_QUEUE_OVERFLOW = 0x35;
    ChannelResponse.prototype.NVM_FULL_ERROR = 0x40;
    ChannelResponse.prototype.NVM_WRITE_ERROR = 0x41;
    ChannelResponse.prototype.USB_STRING_WRITE_FAIL = 0x70;
    ChannelResponse.prototype.MESG_SERIAL_ERROR_ID = 0xAE;
    ChannelResponse.prototype.ENCRYPT_NEGOTIATION_SUCCESS = 0x38;
    ChannelResponse.prototype.ENCRYPT_NEGOTIATION_FAIL = 0x39;

    ChannelResponse.prototype.MESSAGE = {

      0x00 : "RESPONSE_NO_ERROR",
      0x01: "EVENT_RX_SEARCH_TIMEOUT", //  "The search is terminated, and the channel has been automatically closed."
      0x02: "EVENT_RX_FAIL",
      0x03: "EVENT_TX",
      0x04: "EVENT_TRANSFER_RX_FAILED",
      0x05: "EVENT_TRANSFER_TX_COMPLETED",
      0x06: "EVENT_TRANSFER_TX_FAILED",
      0x07: "EVENT_CHANNEL_CLOSED",
      0x08: "EVENT_RX_FAIL_GO_TO_SEARCH",
      0x09: "EVENT_CHANNEL_COLLISION",
      0x0A: "EVENT_TRANSFER_TX_START",
      0x0F :"EVENT_CHANNEL_ACTIVE",
      0x11 :"EVENT_TRANSFER_NEXT_DATA_BLOCK",
      0x15: "CHANNEL_IN_WRONG_STATE",
      0x16: "CHANNEL_NOT_OPENED",
      0x18: "CHANNEL_ID_NOT_SET",
      0x19: "CLOSE_ALL_CHANNELS",
      0x1F: "TRANSFER_IN_PROGRESS",
      0x20: "TRANSFER_SEQUENCE_NUMBER_ERROR",
      0x21: "TRANSFER_IN_ERROR",
      0x27: "MESSAGE_SIZE_EXCEEDS_LIMIT",
      0x28: "INVALID_MESSAGE",
      0x29: "INVALID_NETWORK_NUMBER",
      0x30: "INVALID_LIST_ID",
      0x31: "INVALID_SCAN_TX_CHANNEL",
      0x33: "INVALID_PARAMETER_PROVIDED",
      0x34: "EVENT_SERIAL_QUEUE_OVERFLOW",
      0x35: "EVENT_QUEUE_OVERFLOW",
      0x40: "NVM_FULL_ERROR",
      0x41: "NVM_WRITE_ERROR",
      0x70: "USB_STRING_WRITE_FAIL",
      0xAE: "MESG_SERIAL_ERROR_ID",
      0x38: "ENCRYPT_NEGOTIATION_SUCCESS",
      0x39: "ENCRYPT_NEGOTIATION_FAIL",
    };


   ChannelResponse.prototype.toString = function ()
   {
     var msg = 'Ch '+this.channel+ 'Response for ';

     switch (this.initiatingId)
     {
       case 0x01 : msg += 'RF Event ';
                  break;
       default : msg += Message.prototype.MESSAGE[this.initiatingId]+' ';
                  break;
     }

     msg += ChannelResponse.prototype.MESSAGE[this.code];

     return msg;

   };

    module.exports = ChannelResponse;
    return module.exports;
  });
