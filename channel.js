var events = require('events'),
   util = require('util');
//var Network = require('./network.js');

// Inheritance: deviceprofile inherits channel
function Channel() {
    events.EventEmitter.call(this);
    this.options = {};
}

util.inherits(Channel, events.EventEmitter);


Channel.prototype.addConfiguration = function (name, options)
{
    this.options[name] = options;
}

Channel.prototype.showConfiguration = function (name) {
    var options = this.options[name];

    function format(number) {
        if (number === 0x00)
            return "*";
        else
            return '' + number;
    }

    function formatMessagePeriod(messagePeriod)
    {
        var rate;
        if (typeof messagePeriod !== "undefined") 
            switch (messagePeriod) {
                case 65535: rate = "0.5 Hz (65535)"; break;
                case 32768: rate = "1 Hz (32768)"; break;
                case 16384: rate = "2 Hz (16384)"; break;
                case 8192: rate = "4 Hz (8192)"; break;
                case 8070: rate = (32768 / 8070).toFixed(2) + "Hz (8070)"; break; // HRM
                case 4096: rate = "8 Hz (4096)"; break;
                default: rate = messagePeriod + " " + (32768 / messagePeriod).toFixed(2) + "Hz"; break;
            } 
        else
            rate = "Default";

           return rate;
    }

    function formatSearchTimeout(searchTimeout) {
        var friendlyFormat;
        if (typeof searchTimeout === "undefined")
            return 'undefined';

            switch (searchTimeout) {
                case 0:
                    friendlyFormat = "Disabled";
                    break;
                case 255:
                    friendlyFormat = "Infinity";
                    break;
                default:
                    friendlyFormat = searchTimeout * 2.5 + "s";
                    break;
          }

            return friendlyFormat;

    }

    function formatExtendedAssignment(extendedAssignment) {
        if (typeof extendedAssignment === "undefined")
            return 'undefined';

        if (typeof extendedAssignment === "string") // Parsing/validation is done when host establish channel
            return extendedAssignment;

        if (typeof extendedAssignment === "number")
            return Channel.prototype.EXTENDED_ASSIGNMENT[extendedAssignment];
    }

    return name +" "+ options.channelId.toString()+
        ' RF ' + (options.RFfrequency + 2400) + 'MHz Tch ' + formatMessagePeriod(options.channelPeriod)+ ' LP '+
        formatSearchTimeout(options.LPsearchTimeout) + ' HP ' + formatSearchTimeout(options.HPsearchTimeout) + ' ext.Assign ' + formatExtendedAssignment(options.extendedAssignment);
}


//Channel.prototype.setChannelNumer = function (channel) {
//    this.channelNumber = channel;
//}

Channel.prototype.EXTENDED_ASSIGNMENT = {
    0x01: "Background Scanning",
    0x04: "Frequency Agility",
    0x10: "Fast Channel Initiation",
    0x20: "Asynchronous Transmission",
    BACKGROUND_SCANNING_ENABLE: 0x01,
    FREQUENCY_AGILITY_ENABLE: 0x04,
    FAST_CHANNEL_INITIATION_ENABLE: 0x10,
    ASYNCHRONOUS_TRANSMISSION_ENABLE: 0x20
};

//Channel.prototype.EVENT = {

//    // Event and responses
//    CHANNEL_RESPONSE_EVENT: "channelResponseEvent",

//    // Data

//    BROADCAST: "broadcast",
//    BURST : "burst"
//},

// Check for a bidirectional master channel
Channel.prototype.isMaster = function (configurationName) {
    var options = this.options[configurationName],
        channelType = options.channelType;

    if (typeof channelType === "undefined")
        return false;

    if (typeof channelType === 'number')
        return (channelType === Channel.prototype.TYPE.BIDIRECTIONAL_MASTER_CHANNEL)
    else if (channelType === 'master')
        return true;
    else return false;
       
}

Channel.prototype.TYPE = {

    // Bidirectional
    0x00: "Bidirectional SLAVE",
    BIDIRECTIONAL_SLAVE_CHANNEL: 0x00, // slave

    0x10: "Bidirectional MASTER",
    BIDIRECTIONAL_MASTER_CHANNEL: 0x10, // master

    // Unidirectional
    0x50: "MASTER Transmit Only(legacy)",
    MASTER_TRANSMIT_ONLY_CHANNEL: 0x50,

    0x40: "SLAVE Receive Only (diagnostic)",
    SLAVE_RECEIVE_ONLY_CHANNEL: 0x40,

    // Shared channels

    0x20: "Shared bidirectional SLAVE",
    SHARED_BIDIRECTIONAL_SLAVE_CHANNEL: 0x20,

    0x30: "Shared bidirectional MASTER",
    SHARED_BIDIRECTIONAL_MASTER_CHANNEL: 0x30
};



module.exports = Channel;