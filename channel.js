var events = require('events'),
   util = require('util');
//var Network = require('./network.js');

/*
Options
{
name : (unique)
number :
type :
networkNumber:
networkKey:
extendedAssignment :
channelID : {
  deviceNumber : 
  deviceType:
  transmissionType:
  }
messagePeriod:
LPsearchTimeout:
RFfrequency:
transmitPower:
}
*/
// Inheritance: deviceprofile inherits channel
function Channel() {
    this.options = {};
   
    //if (options) 
    //    this.options = options;
        //this.channelName = options.channelName;
        //this.channelNumber = options.channelNumber;
        //this.channelType = options.channelType;
        //this.networkNumber = options.networkNumber;
        //this.networkKey = options.networkKey;

        //this.channelID = options.channelID;
      

       //this.channelPeriod = options.channelPeriod;
       //this.RFfrequency = options.RFfrequency;
        //this.LPsearchTimeout = options.LPsearchTimeout;
        //this.extendedAssignment = options.extendedAssignment;
        //this.transmitPower = options.transmitPower;
  
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
                default: rate = usMessagePeriod + " " + (32768 / usMessagePeriod).toFixed(2) + "Hz"; break;
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

    return name +" "+ options.channelId.toString()+
        ' RF ' + (options.RFfrequency + 2400) + 'MHz Tch ' + formatMessagePeriod(options.channelPeriod)+ ' HP '+formatSearchTimeout(options.HPsearchTimeout)+' LP '+
        formatSearchTimeout(options.LPsearchTimeout);
}


//Channel.prototype.setChannelNumer = function (channel) {
//    this.channelNumber = channel;
//}

Channel.prototype.EXTENDED_ASSIGNMENT = {
    0x01: "Background Scanning Enable",
    0x04: "Frequency Agility Enable",
    0x10: "Fast Channel Initiation Enable",
    0x20: "Asynchronous Transmission Enable",
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

Channel.prototype.isMaster = function () {
    return (this.channelType === Channel.prototype.TYPE.BIDIRECTIONAL_MASTER_CHANNEL ||
        this.channelType === Channel.prototype.TYPE.MASTER_TRANSMIT_ONLY_CHANNEL ||
        this.channelType === Channel.prototype.TYPE.SHARED_BIDIRECTIONAL_MASTER_CHANNEL);
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

Channel.prototype.WILDCARD = 0x00

//Channel.prototype.isBackgroundSearchChannel = function ()
//{
//    return this.extendedAssignment & Channel.prototype.EXTENDED_ASSIGNMENT.BACKGROUND_SCANNING_ENABLE;
//}

//Channel.prototype.setExtendedAssignment = function (extendedAssignment) {
//    var friendly = "";
//    this.extendedAssignment = extendedAssignment;

//    if (this.extendedAssignment & Channel.prototype.EXTENDED_ASSIGNMENT.BACKGROUND_SCANNING_ENABLE)
//        friendly += Channel.prototype.EXTENDED_ASSIGNMENT[Channel.prototype.EXTENDED_ASSIGNMENT.BACKGROUND_SCANNING_ENABLE];

//    if (this.extendedAssignment & Channel.prototype.EXTENDED_ASSIGNMENT.FREQUENCY_AGILITY_ENABLE)
//        friendly += Channel.prototype.EXTENDED_ASSIGNMENT[Channel.prototype.EXTENDED_ASSIGNMENT.FREQUENCY_AGILITY_ENABLE];

//    if (this.extendedAssignment & Channel.prototype.EXTENDED_ASSIGNMENT.FAST_CHANNEL_INITIATION_ENABLE)
//        friendly += Channel.prototype.EXTENDED_ASSIGNMENT[Channel.prototype.EXTENDED_ASSIGNMENT.FAST_CHANNEL_INITIATION_ENABLE];

//    if (this.extendedAssignment & Channel.prototype.EXTENDED_ASSIGNMENT.ASYNCHRONOUS_TRANSMISSION_ENABLE)
//        friendly += Channel.prototype.EXTENDED_ASSIGNMENT[Channel.prototype.EXTENDED_ASSIGNMENT.ASYNCHRONOUS_TRANSMISSION_ENABLE];

//    this.extendedAssignmentFriendly = friendly;

//};

//Channel.prototype.setChannelId = function (usDeviceNum, ucDeviceType, ucTransmissionType, pairing) {
//    if (typeof usDeviceNum === "undefined" || typeof ucDeviceType === "undefined" || typeof ucTransmissionType === "undefined") {
//        console.trace();
//        console.error("Undefined parameters ", usDeviceNum, ucDeviceType, ucTransmissionType);
//    }
//    this.channelID = {};

//    this.channelID.deviceNumber = usDeviceNum; // 16-bit
//    this.channelID.deviceType = ucDeviceType; // i.e HRM = 0x78 = 120 dec. 8-bit ANTWare 0 - 127, 0 = wildcard, 7-bit pairing
//    if (pairing)
//        this.channelID.deviceType = ucDeviceType | 0x80; // Set bit 7 high;

//    this.channelID.transmissionType = ucTransmissionType;

//    //  return this.channelID;
//};

//Channel.prototype.setChannelPeriod = function (usMessagePeriod) {
//    var rate;
//    this.period = usMessagePeriod;

//    switch (usMessagePeriod) {
//        case 65535: rate = "0.5 Hz (65535)"; break;
//        case 32768: rate = "1 Hz (32768)"; break;
//        case 16384: rate = "2 Hz (16384)"; break;
//        case 8192: rate = "4 Hz (8192)"; break;
//        case 8070: rate = (32768 / 8070).toFixed(2) + " Hz (8070)"; break; // HRM
//        case 4096: rate = "8 Hz (4096)"; break;
//        default: rate = usMessagePeriod + " " + (32768 / usMessagePeriod).toFixed(2) + " Hz"; break;
//    }

//    this.periodFriendly = rate;
//};

//Channel.prototype.setChannelSearchTimeout = function (ucSearchTimeout) {
//    var friendlyFormat;

//    this.searchTimeout = ucSearchTimeout;

//    switch (ucSearchTimeout) {
//        case 0:
//            friendlyFormat = "Setting search timeout for channel " + this.number + " to " + ucSearchTimeout + " = Disable high priority search mode";
//            break;
//        case 255:
//            friendlyFormat = "Setting search timeout for channel " + this.number + " to " + ucSearchTimeout + " = Infinite search";
//            break;
//        default:
//            friendlyFormat = "Setting search timeout for channel " + this.number + " to " + ucSearchTimeout + " = " + ucSearchTimeout * 2.5 + "sec.";
//            break;
//    }

//    this.searchTimeoutFriendly = friendlyFormat;
//};

//Channel.prototype.setLowPrioritySearchTimeout = function (ucSearchTimeout) {
//    var friendlyFormat;

//    this.lowPrioritySearchTimeout = ucSearchTimeout;
//    // Timeout in sec. : ucSearchTimeout * 2.5 s, 255 = infinite, 0 = disable low priority search
//    switch (ucSearchTimeout) {
//        case 0:
//            friendlyFormat = "Setting search timeout for channel " + this.number + " to " + ucSearchTimeout + " = Disable low priority search mode";
//            break;
//        case 255:
//            friendlyFormat = "Setting search timeout for channel " + this.number + " to " + ucSearchTimeout + " = Infinite search";
//            break;
//        default:
//            friendlyFormat = "Setting search timeout for channel " + this.number + " to " + ucSearchTimeout + " = " + ucSearchTimeout * 2.5 + " sec.";
//            break;
//    }

//    this.lowPrioritySearchTimeoutFriendly = friendlyFormat;
//};

//Channel.prototype.setChannelFrequency = function (ucRFFreq) {
//    var freq = 2400+ ucRFFreq;

//    this.RFfrequency = ucRFFreq;
//    this.RFfrequencyFriendly = "Setting RF frequency to " + freq + " MHz";;
//};

//Channel.prototype.setChannelSearchWaveform = function (waveform) {
//    this.searchWaveform = waveform;
//};

module.exports = Channel;