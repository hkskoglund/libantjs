/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('../messages/Message');

    function RFEvent(channel,initiatingId,code)
    {
      this.channel = channel;
      this.initiatingId = initiatingId; // === 0x01
      this.code  = code;

    }

    RFEvent.prototype.EVENT_RX_SEARCH_TIMEOUT = 0x01;
    RFEvent.prototype.EVENT_RX_FAIL = 0x02;
    RFEvent.prototype.EVENT_TX = 0x03;
    RFEvent.prototype.EVENT_TRANSFER_RX_FAILED = 0x04;
    RFEvent.prototype.EVENT_TRANSFER_TX_COMPLETED= 0x05;
    RFEvent.prototype.EVENT_TRANSFER_TX_FAILED= 0x06;
    RFEvent.prototype.EVENT_CHANNEL_CLOSED= 0x07;
    RFEvent.prototype.EVENT_RX_FAIL_GO_TO_SEARCH= 0x08;
    RFEvent.prototype.EVENT_CHANNEL_COLLISION= 0x09;
    RFEvent.prototype.EVENT_TRANSFER_TX_START= 0x0A;
        // Found in antdefines.h of ANT-FS PC Tools SDK (ANTFS_PC_Tools_src\antfs_pc_tools_src_v1.3.0\ANTFSHostDemo\ANT_LIB\inc), not mentioned in rev 5.0b ANT Message Protocol and Usage
        // Seen on testing multiple retries of assign channel command nRF24AP2 USB
    RFEvent.prototype.EVENT_CHANNEL_ACTIVE= 0x0F;
    RFEvent.prototype.EVENT_TRANSFER_NEXT_DATA_BLOCK= 0x11;

    RFEvent.prototype.EVENT_SERIAL_QUEUE_OVERFLOW = 0x34;
    RFEvent.prototype.EVENT_QUEUE_OVERFLOW = 0x35;

    RFEvent.prototype.MESSAGE = {
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

      0x34: "EVENT_SERIAL_QUEUE_OVERFLOW",
      0x35: "EVENT_QUEUE_OVERFLOW"
    };

    RFEvent.prototype.toString = function ()
    {

      return 'Ch '+this.channel+' RF event '+RFEvent.prototype.MESSAGE[this.code];

    };

     module.exports = RFEvent;
     return module.exports;
});
