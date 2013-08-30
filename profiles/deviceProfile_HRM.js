var DeviceProfile = require('./deviceProfile.js'),
    util = require('util');

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

    this.addConfiguration("slave16140", {
        networkKey: ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"],
        //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
        channelType: "slave",
        channelId: { deviceNumber: '*', deviceType: '*', transmissionType: '*' },
        RFfrequency: 57,     // 2457 Mhz ANT +
        LPsearchTimeout: 24, // 60 seconds
        HPsearchTimeout: 10, // 25 seconds n*2.5 s
        //transmitPower: 3,
        //channelTxPower : 3,
        channelPeriod: 8070*2, // HRM
        //channelPeriod : 8086, //SPDCAD
        proximitySearch: 10   // 0 - disabled 1 (nearest) - 10 (farthest)

    });

    this.addConfiguration("slave32280", {
        networkKey: ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"],
        //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
        channelType: "slave",
        channelId: { deviceNumber: '*', deviceType: '*', transmissionType: '*' },
        RFfrequency: 57,     // 2457 Mhz ANT +
        LPsearchTimeout: 24, // 60 seconds
        HPsearchTimeout: 10, // 25 seconds n*2.5 s
        //transmitPower: 3,
        //channelTxPower : 3,
        channelPeriod: 8070 * 4, // HRM
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

    this.page = {};

    this.duplicateMessageCounter = 0;

    this.previousPageChangeToggle = {};

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
    CHANNEL_RESPONSE_RF_EVENT: 'channelResponseRFEvent',
    RESPONSE: 'response',
    RF_EVENT: 'RFevent'
};


DeviceProfile_HRM.prototype.channelResponseRFevent = function (channelResponse) {
    console.log(Date.now(), "HRM got channel response/RF event", channelResponse);
};

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


//    this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients


DeviceProfile_HRM.prototype.toString = function () {
    var msg = this.page.type + " " + this.page.number + " Toggle " + this.page.changeToggle + " HR " + this.page.computedHeartRate + " C " + this.page.heartBeatCount +
                " Tn " + this.page.heartBeatEventTime;

    switch (this.page.number) {
        case 4:
            msg += " Tn-1 " + this.page.previousHeartBeatEventTime + " T-Tn-1 " + (this.page.heartBeatEventTime - this.page.previousHeartBeatEventTime);
            if (this.page.RRInterval)
                msg += " RR (ms) " + this.page.RRInterval.toFixed(1);
            break;

        case 3:
            msg += " HW version " + this.page.hardwareVersion + " SW version " + this.page.softwareVersion + " Model " +
                        this.page.modelNumber;
            break;

        case 2:
            msg += " Manufacturer " + this.page.manufacturerID + " serial number : " + this.page.serialNumber;
            break;

        case 1:
            msg += " Cumulative operating time (s) " + this.page.cumulativeOperatingTime + " hours: " + (this.page.cumulativeOperatingTime / 3600).toFixed(1);
            break;

        case 0:
            msg += "Main - unknown data format";
            break;

        default:
            msg += "Unknown page number " + this.page.number;
            break;


    }

    return msg + " " + this.broadcast.channelId.toString();
};

DeviceProfile_HRM.prototype.STATE = {
    HR_EVENT: 1,
    NO_HR_EVENT: 0 // Sets computed heart rate to invalid = 0x00, after a timeout of 5 seconds
};

// HRM sends out pages in page 4 * 64, background page 1 (for 1 second), page 4 *64, background page 2 (1 s.), page 4*64, background page 3 (1 s),....
// When no HR data is sent from HR sensor, only background pages are sent each channel period; b1*64,b2*64,b3*64,b1*64,..... in accordance with the
// normal behaviour of a broadcast master -> just repeat last broadcast if no new data available, then go to sleep if no HR data received in {timeout} millisec.
// It seems like the {timeout} of HRM sensor "GARMIN HRM2-SS" is 2 minutes.

DeviceProfile_HRM.prototype.broadCastDataParser = function (broadcast) {
    if (broadcast.channelId.deviceType !== DeviceProfile_HRM.prototype.DEVICE_TYPE)
    {
        console.log(Date.now(), "Received broadcast from non HRM device type 0x", broadcast.channelId.deviceType.toString(16), " routing of broadcast is wrong!");
        return;
    }

    if (broadcast.channelId.usesANTPLUSGlobalDataPages()) 
        console.log(Date.now(), "Seems like ANT+ global data pages are used, but no support for intepretation here.");

    this.broadcast = broadcast;
    //console.log(Date.now(), "C# " + broadcast.channel, broadcast.toString());
    var data = broadcast.data,
        receivedTimestamp = Date.now(),
        deviceId = "DN_" + this.broadcast.channelId.deviceNumber + "DT_" + this.broadcast.channelId.deviceType + "T_" + this.broadcast.channelId.transmissionType,
        heartBeatCountDiff,
        heartBeatEventTimeDiff,
        TIMEOUT_CLEAR_COMPUTED_HEARTRATE = 5000;

    // Filter ONE - page toogle bit -> can only receive from toggeling master

    // "The transmitter toggles the state of the toggle bit every fourth message (~1Hz) if the transmitter is using any 
    // of the page formats other than the page 0 data format -> page 4 format". (ANT Device Profile HRM, p. 14) 
    // Holds toggle for approx. 1 second -> 1 Hz message period enough to register toggle
    // "The receiver may not interpret bytes 0-3 until it has seen this bit set to both a 0 and a 1" (ANT+ HRM spec, p. 15) -> can be used to skip duplicates

    this.page.changeToggle = (data[0] & 0x80) >> 7; // Bit 7    MSB
    if (this.page.changeToggle === this.previousPageChangeToggle[deviceId] || typeof this.previousPageChangeToggle[deviceId] === 'undefined') // Filter
    {
        if (typeof this.previousPageChangeToggle[deviceId] === 'undefined')
            this.previousPageChangeToggle[deviceId] = this.page.changeToggle;

        return;
    }

    this.previousPageChangeToggle[deviceId] = this.page.changeToggle;

    // FILTER TWO

    // Skip duplicate messages from same master (disregard page toogle bit + number -> slice off first byte in comparison)
    if (this.previousBroadcastData[deviceId] && this.previousBroadcastData[deviceId].slice(1).toString() === data.slice(1).toString()) {
        this.duplicateMessageCounter++;
        return;
    } 

    if (this.duplicateMessageCounter > 0) {
        console.log("Skipped " + this.duplicateMessageCounter + " duplicate messages from "+broadcast.channelId.toString());
        this.duplicateMessageCounter = 0;
    }

    this.page.number = data[0] & 0x7F;  // Bit 6-0, -> defines the definition of the following 3 bytes (byte 1,2,3)
        

    // Next 3 bytesis the same for every data page. (ANT+ HRM spec. p. 14, section 5.3)

    // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
    this.page.heartBeatEventTime = data.readUInt16LE(4);

    // Counter for each heart beat event, rollover 255 counts
    this.page.heartBeatCount = data[6];

    // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
    this.page.computedHeartRate = data[7];


    if (this.page.heartBeatCount === this.previousHeartBeatCount[deviceId]) {
        //console.log(Date.now(), "No heart beat event registered"); // One case : happens often for background page page 4 -> page 2 transition

        if (this.state === DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT)
            this.page.computedHeartRate = 0x00;

        this.timeOutSetInvalidComputedHR = setTimeout(function () {
            this.state = DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT;
            this.page.computedHeartRate = 0x00; // Set to invalid
        }.bind(this), TIMEOUT_CLEAR_COMPUTED_HEARTRATE);
    }
    else {
        clearTimeout(this.timeOutSetInvalidComputedHR);
        this.state = DeviceProfile_HRM.prototype.STATE.HR_EVENT;
    }

    this.page.timestamp = receivedTimestamp;
    this.page.channelId = broadcast.channelId;


    switch (this.page.number) {

        case 4:
            // Main data page

            this.page.type = "Main";

            this.page.previousHeartBeatEventTime = data.readUInt16LE(2);

            // Only calculate RR if there is less than 64 seconds between data pages and 1 beat difference between last reception of page
            if (this.previousReceivedTimestamp[deviceId] && (receivedTimestamp - this.previousReceivedTimestamp[deviceId]) < 64000) {


                heartBeatCountDiff = this.page.heartBeatCount - this.previousHeartBeatCount[deviceId];
                if (heartBeatCountDiff < 0)  // Toggle 255 -> 0
                    heartBeatCountDiff += 256;

                if (heartBeatCountDiff === 1) {
                    heartBeatEventTimeDiff = this.page.heartBeatEventTime - this.page.previousHeartBeatEventTime;

                    if (heartBeatEventTimeDiff < 0) // Roll over
                        heartBeatEventTimeDiff += 0xFFFF;

                    this.page.RRInterval = (heartBeatEventTimeDiff / 1024) * 1000; // ms.
                }
            }

            break;

        case 3: // Background data page
            this.page.type = "Background";

            this.page.hardwareVersion = data[1];
            this.page.softwareVersion = data[2];
            this.page.modelNumber = data[3];

            break;

        case 2: // Background data page - sent every 65'th message
            this.page.type = "Background";

            this.page.manufacturerID = data[1];
            this.page.serialNumber = data.readUInt16LE(2); // Upper 16-bits of a 32 bit serial number

            // Set the lower 2-bytes of serial number, if available in channel Id.
            if (typeof broadcast.channelId !== "undefined" && typeof broadcast.channelId.deviceNumber !== "undefined")
                this.page.serialNumber = (this.page.serialNumber << 16) | broadcast.channelId.deviceNumber;

            break;

        case 1: // Background data page
            this.page.type = "Background";

            this.page.cumulativeOperatingTime = (data.readUInt32LE(1) & 0x00FFFFFF) * 2; // Seconds since reset/battery replacement

            break;

        case 0: // Main - unknown data format, transmitter shall set the value to 0xFF
            this.page.type = "Main";
            break;

        default:
            throw new Error("Page " + this.page.number + " not supported");
            //break;
    }

    console.log(this.toString());

    this.previousReceivedTimestamp[deviceId] = receivedTimestamp;
    this.previousBroadcastData[deviceId] = data;
    this.previousHeartBeatCount[deviceId] = this.page.heartBeatCount;
};

module.exports = DeviceProfile_HRM;