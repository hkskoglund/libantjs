/* global define: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";

var ANTMessage = require('messages/ANTMessage');

function CapabilitiesMessage(data) {

    //if (typeof data !== "undefined") {
    //    ANTMessage.call(this, data);
    //    this.parse();
    //} else
        ANTMessage.call(this,data);

    this.name = "Capabilities";
    this.id = ANTMessage.prototype.MESSAGE.CAPABILITIES;
    this.type = ANTMessage.prototype.TYPE.RESPONSE;
    this.requestId = ANTMessage.prototype.MESSAGE.REQUEST;
    
    if (data)
        this.parse();

   // console.log("Created CapabilitiesMessage", this);
}

CapabilitiesMessage.prototype = Object.create(ANTMessage.prototype);

CapabilitiesMessage.prototype.constructor = CapabilitiesMessage;


// Inspired by Dynastream Android SDK 4.0.0
CapabilitiesMessage.prototype.getNumberOfChannels = function ()
{
    return this.content[0];
};

// Inspired by Dynastream Android SDK 4.0.0
CapabilitiesMessage.prototype.getNumberOfNetworks = function ()
{
    return this.content[1];
};

// ANT Message Protocol and Usage. rev 5.0b - page 115
CapabilitiesMessage.prototype.parse = function () {
   
    this.MAX_CHAN =  this.content[0];
    this.MAX_NET = this.content[1];

    var standardOptions = this.content[2],

        advancedOptions = this.content[3],

    // Documentation update http://www.thisisant.com/forum/viewthread/4250/

        advancedOptions2 = this.content[4],

        advancedOptions3 = this.content[6],

        advancedOptions4 = this.content[7];
    
    this.maxSensRcoreChannels =  this.content[5];
   
   // ANT USB 2 does not have advanced options 3, so it will be undefined
    advancedOptions3 = this.content[6]; 
    
    this.standardOptions = {
        value: "MSB " + standardOptions.toString(2) + " " + standardOptions,
        CAPABILITIES_NO_RECEIVE_CHANNELS : standardOptions & 0x01,
        CAPABILITIES_NO_TRANSMIT_CHANNELS : standardOptions & 0x02,
        CAPABILITIES_NO_RECEIVE_MESSAGES : standardOptions & (1 << 3),
        CAPABILITIES_NO_TRANSMIT_MESSAGES : standardOptions & (1 << 4),
        CAPABILITIES_NO_ACKD_MESSAGES : standardOptions & (1 << 5),
        CAPABILITIES_NO_BURST_MESSAGES : standardOptions & (1 << 6),
    };

    this.advancedOptions = {
        value: "MSB " + advancedOptions.toString(2) + " " + advancedOptions,
        CAPABILITIES_NETWORK_ENABLED : advancedOptions & 0x02,
        CAPABILITIES_SERIAL_NUMBER_ENABLED : advancedOptions & (1 << 3),
        CAPABILITIES_PER_CHANNEL_TX_POWER_ENABLED : advancedOptions & (1 << 4),
        CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED : advancedOptions & (1 << 5),
        CAPABILITIES_SCRIPT_ENABLED : advancedOptions & (1 << 6),
        CAPABILITIES_SEARCH_LIST_ENABLED : advancedOptions & (1 << 7),
    };

    if (advancedOptions2 !== undefined)
    this.advancedOptions2 = {
        value: "MSB " + advancedOptions2.toString(2) + " " + advancedOptions2,
        CAPABILITIES_LED_ENABLED : advancedOptions2 & 0x01,
        CAPABILITIES_EXT_MESSAGE_ENABLED : advancedOptions2 & 0x02,
        CAPABILITIES_SCAN_MODE_ENABLED : advancedOptions2 & (1 << 2),
        CAPABILITIES_PROXY_SEARCH_ENABLED : advancedOptions2 & (1 << 4),
        CAPABILITIES_EXT_ASSIGN_ENABLED : advancedOptions2 & (1 << 5),
        CAPABILITIES_FS_ANTFS_ENABLED : advancedOptions2 & (1 << 6), // (1 << n) = set bit n high (bit numbered from 0 - n)
    };

    if (advancedOptions3 !== undefined)
        this.advancedOptions3 = {
            value : "MSB "+advancedOptions3.toString(2) + " " + advancedOptions3,
            CAPABILITIES_ADVANCED_BURST_ENABLED : advancedOptions3 & 0x01,
            CAPABILITIES_EVENT_BUFFERING_ENABLED : advancedOptions3 & 0x02,
            CAPABILITIES_EVENT_FILTERING_ENABLED : advancedOptions3 & (1 << 2),
            CAPABILITIES_HIGH_DUTY_SEARCH_ENABLED : advancedOptions3 & (1 << 3),
            CAPABILITIES_SELECTIVE_DATA_ENABLED : advancedOptions3 & (1 << 6)
        };
     
    if (advancedOptions4 !== undefined)
        this.advancedOptions4 = {
            value: "MSB " + advancedOptions4.toString(2) + " " + advancedOptions4,
            CAPABILITIES_RFACTIVE_NOTIFICATION_ENABLED: advancedOptions4 & 0x01 // Bit 0
            // Bit 1-7 reserved
        }
   
};

//CapabilitiesMessage.prototype.showCapabilities = function ()
//{
//    console.log("Capabilities\n------------");
//    console.log("Max channels " + this.getNumberOfChannels());
//    console.log("Max network " + this.getNumberOfNetworks());

//    if (this.standardOptions.CAPABILITIES_NO_RECEIVE_CHANNELS)
//        console.log("No receive channels");
//    if (this.standardOptions.CAPABILITIES_NO_TRANSMIT_CHANNELS)
//        console.log("No transmit channels");
//    if (this.standardOptions.CAPABILITIES_NO_RECEIVE_MESSAGES)
//        console.log("No receive messages");
//    if (this.standardOptions.CAPABILITIES_NO_TRANSMIT_MESSAGES)
//        console.log("No transmit messages");
//    if (this.standardOptions.CAPABILITIES_NO_ACKD_MESSAGES)
//        console.log("No ackd. messages");
//    if (this.standardOptions.CAPABILITIES_NO_BURST_MESSAGES)
//        console.log("No burst messages");

//    if (this.advancedOptions.CAPABILITIES_NETWORK_ENABLED)
//        console.log("Network");
//    if (this.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED)
//        console.log("Serial number");
//    if (this.advancedOptions.CAPABILITIES_PER_CHANNEL_TX_POWER_ENABLED)
//        console.log("Per channel Tx Power");
//    if (this.advancedOptions.CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED)
//        console.log("Low priority search");
//    if (this.advancedOptions.CAPABILITIES_SCRIPT_ENABLED)
//        console.log("Script");
//    if (this.advancedOptions.CAPABILITIES_SEARCH_LIST_ENABLED)
//        console.log("Search list");

//    if (this.advancedOptions2.CAPABILITIES_LED_ENABLED)
//        console.log("Led");
//    if (this.advancedOptions2.CAPABILITIES_EXT_MESSAGE_ENABLED)
//        console.log("Extended messages");
//    if (this.advancedOptions2.CAPABILITIES_SCAN_MODE_ENABLED)
//        console.log("Scan mode");
//    if (this.advancedOptions2.CAPABILITIES_PROXY_SEARCH_ENABLED)
//        console.log("Proximity search");
//    if (this.advancedOptions2.CAPABILITIES_EXT_ASSIGN_ENABLED)
//        console.log("Extended assign");
//    if (this.advancedOptions2.CAPABILITIES__FS_ANTFS_ENABLED)
//        console.log("ANT-FS");

//    if (this.advancedOptions3.CAPABILITIES_ADVANCED_BURST_ENABLED)
//        console.log("Advanced burst");
//    if (this.advancedOptions3.CAPABILITIES_EVENT_BUFFERING_ENABLED)
//        console.log("Event buffering");
//    if (this.advancedOptions3.CAPABILITIES_EVENT_FILTERING_ENABLED)
//        console.log("Event filtering");
//    if (this.advancedOptions3.CAPABILITIES_HIGH_DUTY_SEARCH_ENABLED)
//        console.log("High duty search");
//    if (this.advancedOptions3.CAPABILITIES_SELECTIVE_DATA_ENABLED)
//        console.log("Selective data");
//}

CapabilitiesMessage.prototype.toString = function () {
    //console.log("capabilities", this);
    // " ID 0x" + this.id.toString(16)
    var msg = this.name + " Max channels: " + this.getNumberOfChannels() + " Max networks:" + this.getNumberOfNetworks()+ ' Max sensRcore channels: ' + this.maxSensRcoreChannels+' ';

    if (this.standardOptions.CAPABILITIES_NO_RECEIVE_CHANNELS)
        msg += "No receive channels ";
    if (this.standardOptions.CAPABILITIES_NO_TRANSMIT_CHANNELS)
        msg += "No transmit channels ";
    if (this.standardOptions.CAPABILITIES_NO_RECEIVE_MESSAGES)
        msg += "No receive messages ";
    if (this.standardOptions.CAPABILITIES_NO_TRANSMIT_MESSAGES)
        msg += "No transmit messages" ;
    if (this.standardOptions.CAPABILITIES_NO_ACKD_MESSAGES)
        msg += "No ackd. messages ";
    if (this.standardOptions.CAPABILITIES_NO_BURST_MESSAGES)
        msg += "No burst messages ";

    if (this.advancedOptions.CAPABILITIES_NETWORK_ENABLED)
        msg += "Network ";
    if (this.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED)
        msg += "Serial number ";
    if (this.advancedOptions.CAPABILITIES_PER_CHANNEL_TX_POWER_ENABLED)
        msg += "Per channel Tx Power ";
    if (this.advancedOptions.CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED)
        msg += "Low priority search " ;
    if (this.advancedOptions.CAPABILITIES_SCRIPT_ENABLED)
        msg += "Script ";
    if (this.advancedOptions.CAPABILITIES_SEARCH_LIST_ENABLED)
        msg += "Search list ";

    if (this.advancedOptions2) {
        if (this.advancedOptions2.CAPABILITIES_LED_ENABLED)
            msg += "Led ";
        if (this.advancedOptions2.CAPABILITIES_EXT_MESSAGE_ENABLED)
            msg += "Extended messages ";
        if (this.advancedOptions2.CAPABILITIES_SCAN_MODE_ENABLED)
            msg += "Scan mode ";
        if (this.advancedOptions2.CAPABILITIES_PROXY_SEARCH_ENABLED)
            msg += "Proximity search ";
        if (this.advancedOptions2.CAPABILITIES_EXT_ASSIGN_ENABLED)
            msg += "Extended assign ";
        if (this.advancedOptions2.CAPABILITIES__FS_ANTFS_ENABLED)
            msg += "ANT-FS ";
    }

    if (this.advancedOptions3) {
        if (this.advancedOptions3.CAPABILITIES_ADVANCED_BURST_ENABLED)
            msg += "Advanced burst ";
        if (this.advancedOptions3.CAPABILITIES_EVENT_BUFFERING_ENABLED)
            msg += "Event buffering ";
        if (this.advancedOptions3.CAPABILITIES_EVENT_FILTERING_ENABLED)
            msg += "Event filtering ";
        if (this.advancedOptions3.CAPABILITIES_HIGH_DUTY_SEARCH_ENABLED)
            msg += "High duty search ";
        if (this.advancedOptions3.CAPABILITIES_SELECTIVE_DATA_ENABLED)
            msg += "Selective data ";
    }

    if (this.advancedOptions4) {
        if (this.advancedOptions4.CAPABILITIES_RFACTIVE_NOTIFICATION_ENABLED)
            msg += " RF Active notification";
    }
  
    return msg;
};

module.exports = CapabilitiesMessage;
    return module.exports;
});
