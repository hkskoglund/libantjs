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

    ChannelResponse.prototype.NVM_FULL_ERROR = 0x40;
    ChannelResponse.prototype.NVM_WRITE_ERROR = 0x41;
    ChannelResponse.prototype.USB_STRING_WRITE_FAIL = 0x70;
    ChannelResponse.prototype.MESG_SERIAL_ERROR_ID = 0xAE;
    ChannelResponse.prototype.ENCRYPT_NEGOTIATION_SUCCESS = 0x38;
    ChannelResponse.prototype.ENCRYPT_NEGOTIATION_FAIL = 0x39;

    ChannelResponse.prototype.MESSAGE = {

      0x01 : "RESPONSE_NO_ERROR",

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

      0x40: "NVM_FULL_ERROR",
      0x41: "NVM_WRITE_ERROR",
      0x70: "USB_STRING_WRITE_FAIL",
      0xAE: "MESG_SERIAL_ERROR_ID",
      0x38: "ENCRYPT_NEGOTIATION_SUCCESS",
      0x39: "ENCRYPT_NEGOTIATION_FAIL",
    };

   ChannelResponse.prototype.isRFEvent = function ()
   {
     return this.code === 0x01;
   };

   ChannelResponse.prototype.toString = function ()
   {

     return'Ch '+this.channel+'Response for '+Message.prototype.MESSAGE[this.initiatingId]+' '+ChannelResponse.prototype.MESSAGE[this.code];

   };

    module.exports = ChannelResponse;
    return module.exports;
  });
