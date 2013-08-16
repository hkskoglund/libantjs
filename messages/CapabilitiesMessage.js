"use strict"
var ANTMessage = require('./ANTMessage.js'),
    RequestMessage = require('./RequestMessage.js');

// Notification startup raw buffer for COMMAND_RESET : <Buffer a4 01 6f 20 ea>
function CapabilitiesMessage(data) {

    if (typeof data !== "undefined") {
        ANTMessage.call(this, data);
        this.parse();
    } else
        ANTMessage.call(this);

    this.name = "Capabilities";
    this.id = ANTMessage.prototype.MESSAGE.CAPABILITIES;

   // console.log("Created CapabilitiesMessage", this);
}

CapabilitiesMessage.prototype = Object.create(ANTMessage.prototype);

CapabilitiesMessage.prototype.constructor = CapabilitiesMessage;


CapabilitiesMessage.prototype.getBuffer = function () {
    var msg = (new RequestMessage(0, ANTMessage.prototype.MESSAGE.CAPABILITIES)).getBuffer();
   // console.log("Cap msg.:", msg);
  
    //return Buffer.concat([msg, getZeroPadBuffer(64-msg.length)]);
    // ANT chip tolerates 64 byte message padded with zeros, but 65 bytes gives "First byte of USB packet not SYNC" serial error notification

    return msg;
}

CapabilitiesMessage.prototype.toBuffer = CapabilitiesMessage.prototype.getBuffer;

// Inspired by Dynastream Android SDK 4.0.0
CapabilitiesMessage.prototype.getNumberOfChannels = function ()
{
    return this.content[0];
}

// Inspired by Dynastream Android SDK 4.0.0
CapabilitiesMessage.prototype.getNumberOfNetworks = function ()
{
    return this.content[1];
}

// ANT Message Protocol and Usage. rev 5.0b - page 115
CapabilitiesMessage.prototype.parse = function () {
   
    //this.MAX_CHAN =  this.content[0];
    //this.MAX_NET = this.content[1];
    var  standardOptions = this.content[2],
    advancedOptions = this.content[3],
    advancedOptions2 = this.content[4],
    advancedOptions3 = this.content[5];
    
    this.StandardOptions = {
        value : standardOptions.toString(2)+" "+standardOptions,
        CAPABILITIES_NO_RECEIVE_CHANNELS : standardOptions & 0x01,
        CAPABILITIES_NO_TRANSMIT_CHANNELS : standardOptions & 0x02,
        CAPABILITIES_NO_RECEIVE_MESSAGES : standardOptions & (1 << 3),
        CAPABILITIES_NO_TRANSMIT_MESSAGES : standardOptions & (1 << 4),
        CAPABILITIES_NO_ACKD_MESSAGES : standardOptions & (1 << 5),
        CAPABILITIES_NO_BURST_MESSAGES : standardOptions & (1 << 6),
    };

    this.AdvancedOptions = {
        value : advancedOptions.toString(2)+" "+advancedOptions,
        CAPABILITIES_NETWORK_ENABLED : advancedOptions & 0x02,
        CAPABILITIES_SERIAL_NUMBER_ENABLED : advancedOptions & (1 << 3),
        CAPABILITIES_PER_CHANNEL_TX_POWER_ENABLED : advancedOptions & (1 << 4),
        CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED : advancedOptions & (1 << 5),
        CAPABILITIES_SCRIPT_ENABLED : advancedOptions & (1 << 6),
        CAPABILITIES_SEARCH_LIST_ENABLED : advancedOptions & (1 << 7),
    }

    this.AdvancedOptions2 = {
        value : advancedOptions2.toString(2)+" "+advancedOptions2,
        CAPABILITIES_LED_ENABLED : advancedOptions2 & 0x01,
        CAPABILITIES_EXT_MESSAGE_ENABLED : advancedOptions2 & 0x02,
        CAPABILITIES_SCAN_MODE_ENABLED : advancedOptions2 & (1 << 2),
        CAPABILITIES_PROXY_SEARCH_ENABLED : advancedOptions2 & (1 << 4),
        CAPABILITIES_EXT_ASSIGN_ENABLED : advancedOptions2 & (1 << 5),
        CAPABILITIES_FS_ANTFS_ENABLED : advancedOptions2 & (1 << 6), // (1 << n) = set bit n high (bit numbered from 0 - n)
    };

    this.advancedOptions3 = {
        value : advancedOptions3.toString(2) + " " + advancedOptions3,
        CAPABILITIES_ADVANCED_BURST_ENABLED : advancedOptions3 & 0x01,
        CAPABILITIES_EVENT_BUFFERING_ENABLED : advancedOptions3 & 0x02,
        CAPABILITIES_EVENT_FILTERING_ENABLED : advancedOptions3 & (1 << 2),
        CAPABILITIES_HIGH_DUTY_SEARCH_ENABLED : advancedOptions3 & (1 << 3),
        CAPABILITIES_SELECTIVE_DATA_ENABLED : advancedOptions3 & (1 << 6)
    }
     
    this.message = "Max channels: " + this.getNumberOfChannels() + " max networks: " + this.getNumberOfNetworks();

    return this.message;
};

CapabilitiesMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16) + " " + this.message;
}

module.exports = CapabilitiesMessage;