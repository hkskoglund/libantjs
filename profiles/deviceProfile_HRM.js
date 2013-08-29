var DeviceProfile = require('./deviceProfile.js');
var Channel = require('../channel.js');
var Network = require('../network.js');
var ANT = require('libant');
var util = require('util');

function DeviceProfile_HRM(configuration) {
    console.log("HRM configuration", configuration);
    DeviceProfile.call(this, configuration);

    this.addConfiguration("slave", {
        networkKey: ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"],
        //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
        channelType: "slave",
        channelId: { deviceNumber: '*', deviceType: '*', transmissionType: '*' },
        RFfrequency: 57,     // 2457 Mhz ANT +
        LPsearchTimeout: 24, // 60 seconds
        HPsearchTimeout: 10, // 25 seconds n*2.5 s
        //transmitPower: 3,
        //channelTxPower : 3,
        channelPeriod: 8070, // HRM
        //channelPeriod : 8086, //SPDCAD
        proximitySearch: 10   // 0 - disabled 1 (nearest) - 10 (farthest)

    });

    this.addConfiguration("master", {
        networkKey: ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"],
        //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
        channelType: "master",
        channelId: { deviceNumber: 'serial number', deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType: 0x01 }, // Independent channel
        RFfrequency: 57,     // 2457 Mhz ANT +
        //LPsearchTimeout: 24, // 60 seconds
        //HPsearchTimeout: 10, // 25 seconds n*2.5 s
        //transmitPower: 3,
        //channelTxPower : 3,
        channelPeriod: 8070, // HRM
        //channelPeriod : 8086, //SPDCAD
        //proximitySearch: 10   // 0 - disabled 1 (nearest) - 10 (farthest)

    });


    this.on(DeviceProfile_HRM.prototype.EVENT.BROADCAST, this.broadCastDataParser);
    this.on(DeviceProfile_HRM.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, this.channelResponseRFevent);

    this.previousReceivedTimestamp = {}; // Timestamp for last reception of broadcast for specific channel Id device number
    this.previousHeartBeatCount = {}; // Heart Beat Count of previous reception for specific channel Id device number
    this.previousBroadcastData = {};



}

//DeviceProfile_HRM.prototype = Object.create(DeviceProfile.prototype); 

//DeviceProfile_HRM.prototype.constructor = DeviceProfile_HRM; 
util.inherits(DeviceProfile_HRM, DeviceProfile);

DeviceProfile_HRM.prototype.NAME = 'HRM';

DeviceProfile_HRM.prototype.DEVICE_TYPE = 0x78;
// Ca. 4 messages pr. second, or 1 msg. pr 246.3 ms -> max HR supported 246.3 pr/minute 
DeviceProfile_HRM.prototype.CHANNEL_PERIOD = 8070;

DeviceProfile_HRM.prototype.EVENT = {
    BROADCAST: 'broadcast',
    CHANNEL_RESPONSE_RF_EVENT: 'channelResponseRFEvent'
}

//DeviceProfile_HRM.prototype.getSlaveChannelConfiguration = function (config) {
//    console.log("HRM slave channel config", config);
//    // networkNr, channelNr, deviceNr, transmissionType, searchTimeout
//        // ANT+ Managed Network Document – Heart Rate Monitor Device Profile  , p . 9  - 4 channel configuration
//    var channelResponseEventFunc,
//        broadCastDataParserFunc;

//        this.channel = new Channel(config.channelNr, Channel.prototype.CHANNEL_TYPE.receive_channel, config.networkNr, new Buffer(this._configuration.network_keys.ANT_PLUS));

//        this.channel.setChannelId(config.deviceNr, DeviceProfile_HRM.prototype.DEVICE_TYPE, config.transmissionType, false);

//        this.channel.setChannelPeriod(DeviceProfile_HRM.prototype.CHANNEL_PERIOD); 
//        this.channel.setChannelSearchTimeout(config.searchTimeout);
//        this.channel.setChannelFrequency(this._configuration.frequency.ANT_PLUS);

//        broadCastDataParserFunc = this.broadCastDataParser || DeviceProfile.prototype.broadCastDataParser; // Called on received broadcast data
//        channelResponseEventFunc = this.channelResponseEvent || DeviceProfile.prototype.channelResponseEvent;

//        this.channel.addListener(Channel.prototype.EVENT.CHANNEL_RESPONSE_EVENT, channelResponseEventFunc.bind(this));
//        this.channel.addListener(Channel.prototype.EVENT.BROADCAST, broadCastDataParserFunc.bind(this));

//        return channel;
//    }

DeviceProfile_HRM.prototype.channelResponseRFevent = function (channelResponse) {
    console.log(Date.now(),"HRM got channel response/RF event", channelResponse);
}

//DeviceProfile_HRM.prototype.channelResponseEvent = function (data)
//    {
//        var self = this, antInstance = this.ANT, reOpeningTimeout = 5000;

//        if (antInstance.isEvent(ANT.prototype.RESPONSE_EVENT_CODES.EVENT_RX_SEARCH_TIMEOUT, data)) {
//            console.log(Date.now() + " Channel " + self.channel.number + " search timed out.");
//            //setTimeout(function handler() {
//            //    antInstance.open(self.number, function errorCB(error) { console.log(Date.now() + " Failed to reopen channel " + self.number, error); },
//            //        function successCB() { });
//            //}, reOpeningTimeout);
//        }

//        else if (antInstance.isEvent(ANT.prototype.RESPONSE_EVENT_CODES.EVENT_CHANNEL_CLOSED, data)) {
//           // console.log(Date.now() + " Channel " + self.number + " is closed.");
           
//            //if (antInstance.inTransfer) {
//            //    console.log("Cancelling transfer");
//            //    antInstance.inTransfer.cancel(); // Cancel listener on inendpoint
//            //}
//            //setTimeout(function handler() {
//            //    antInstance.open(self.number, function errorCB(error) { console.log(Date.now() + " Failed to reopen channel " + self.number, error); },
//            //        function successCB() { });
//            //}, reOpeningTimeout);
//        }
//    }

DeviceProfile_HRM.prototype.broadCastDataParser = function (broadcast) {
    //console.log(Date.now(), "C# " + broadcast.channel, broadcast.toString());
    var data = broadcast.data,
        receivedTimestamp = Date.now(),
        deviceId = "DN_" + broadcast.channelId.deviceNumber + "DT_" + broadcast.channelId.deviceType + "T_" + broadcast.channelId.transmissionType,
        heartBeatCountDiff,
        heartBeatEventTimeDiff;

    // FILTER - Skip duplicate messages from same master (disregard page toogle bit + dataPageNumber -> slice off first byte in comparison)
    if (this.previousBroadcastData[deviceId] && this.previousBroadcastData[deviceId].slice(1).toString() === data.slice(1).toString())
        return;

        page = {

            // "The transmitter toggles the state of the toggle bit every fourth message (~1Hz) if the transmitter is using any 
            // of the page formats other than the page 0 data format". (ANT Device Profile HRM, p. 14)
            pageChangeToggle: (data[0] & 0x80) >> 7, // Bit 7    MSB,

            dataPageNumber: data[0] & 0x7F,  // Bit 6-0,

            // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
            heartBeatEventTime: data.readUInt16LE(4),
            
            // Counter for each heart beat event, rollover 255 counts
            heartBeatCount: data[6],

            // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
            computedHeartRate: data[7],

        };

       

        page.timestamp = receivedTimestamp;
        page.channelId = broadcast.channelId;

       // console.log("page", page);

        //if (typeof this.channel.channelID === "undefined")
        //    console.log(Date.now(), "No channel ID found for this master, every master has a channel ID, verify that channel ID is set (should be set during parse_response in ANT lib.)");

        //if (typeof this.channel.channelIDCache[this.channel.channelID.toProperty] === "undefined") {
        //    console.log(Date.now(), "Creating object in channelIDCache to store i.e previousHeartBeatEventTime for master with channel Id", this.channel.channelID);
        //    this.channelIDCache[this.channel.channelID.toProperty] = {};
    //}
        console.log("pagenr", page.dataPageNumber);

        switch (page.dataPageNumber) {

            case 4: // Main data page

                page.pageType = "Main";

                page.previousHeartBeatEventTime = data.readUInt16LE(2);

                // Only calculate RR if there is less than 64 seconds between data pages and 1 beat difference between last reception of page
                if (this.previousReceivedTimestamp[deviceId] && (receivedTimestamp - this.previousReceivedTimestamp[deviceId]) < 64000) {

                    
                    var heartBeatCountDiff = page.heartBeatCount-this.previousHeartBeatCount[deviceId];
                    if (heartBeatCountDiff < 0)  // Toggle 255 -> 0
                        heartBeatCountDiff += 256;

                    if (heartBeatCountDiff === 1) {
                        heartBeatEventTimeDiff = page.heartBeatEventTime - page.previousHeartBeatEventTime;
                        
                        if (heartBeatEventTimeDiff < 0) // Roll over
                            heartBeatEventTimeDiff += 0xFFFF;

                        page.RRInterval = (heartBeatEventTimeDiff / 1024) * 1000; // ms.
                    }
                }

               
                var msg = page.pageType + " " + page.dataPageNumber + " Toggle " + page.pageChangeToggle + " HR " +
                    page.computedHeartRate + " C " + page.heartBeatCount +
                    " T " + page.heartBeatEventTime + " Tp " + page.previousHeartBeatEventTime + " T-Tp " + (page.heartBeatEventTime - page.previousHeartBeatEventTime);
                if (page.RRInterval)
                    msg += " RR (ms) " + page.RRInterval.toFixed(1);

                console.log(msg);
                //    this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients

                

                break;

           

            case 3: // Background data page
                page.pageType = "Background";
                page.hardwareVersion = data[ 1];
                page.softwareVersion = data[ 2];
                page.modelNumber = data[3];

                //if (this.channelIDCache[this.channel.channelID.toProperty].previousHeartBeatEventTime !== page.heartBeatEventTime) {
                //    this.channelIDCache[this.channel.channelID.toProperty].previousHeartBeatEventTime = page.heartBeatEventTime;
                    console.log(page.pageType + " " + page.dataPageNumber + " HW version " + page.hardwareVersion + " SW version " + page.softwareVersion + " Model " + page.modelNumber);
                //    this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients
                //}

                break;

            case 2: // Background data page - sent every 65'th message
                page.pageType = "Background";
                page.manufacturerID = data[1];
                page.serialNumber = data.readUInt16LE(2); // Upper 16-bits of a 32 bit serial number, lower 2-bytes is device number as part of channel id.
                if (typeof broadcast.channelId !== "undefined" && typeof broadcast.channelId.deviceNumber !== "undefined")
                    page.serialNumber = (page.serialNumber << 16) & broadcast.channelId.deviceNumber;

                //if (this.channelIDCache[this.channel.channelID.toProperty].previousHeartBeatEventTime !== page.heartBeatEventTime) {
                //    this.channelIDCache[this.channel.channelID.toProperty].previousHeartBeatEventTime = page.heartBeatEventTime;
                //    console.log(page.pageType + " " + page.dataPageNumber + " Manufacturer " + page.manufacturerID + " serial number : " + page.serialNumber);
                //    this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients
                //}

                break;

            case 1: // Background data page
                page.pageType = "Background";
                page.cumulativeOperatingTime = (data.readUInt32LE(1) & 0x00FFFFFF) / 2; // Seconds since reset/battery replacement

                //if (this.channelIDCache[this.channel.channelID.toProperty].previousHeartBeatEventTime !== page.heartBeatEventTime) {
                //    this.channelIDCache[this.channel.channelID.toProperty].previousHeartBeatEventTime = page.heartBeatEventTime;
                //    console.log(page.pageType+" "+page.dataPageNumber+ " Cumulative operating time (s) " + page.cumulativeOperatingTime + " hours: " + page.cumulativeOperatingTime / 3600);
                //    this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients
                //}

                break;

            case 0: // Main - unknown data format
                page.pageType = "Main";
                break;

            default:

                console.log("Page ", dataPageNumber, " not implemented.");
                break;
        }

        this.previousReceivedTimestamp[deviceId] = receivedTimestamp;
        this.previousBroadcastData[deviceId] = data;
        this.previousHeartBeatCount[deviceId] = page.heartBeatCount;

        
    }

module.exports = DeviceProfile_HRM;

