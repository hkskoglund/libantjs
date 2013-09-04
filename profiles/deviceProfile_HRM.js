var DeviceProfile = require('./deviceProfile.js'),
    util = require('util');

function Page(broadcast) {
    this.timestamp = Date.now();

    if (broadcast && broadcast.data) {
        this.channelId = broadcast.channelId;
        this.parseCommon(broadcast.data);
    }
}

Page.prototype.toString = function () {
    var msg = this.type + " P# " + this.number + " T " + this.changeToggle + " HR " + this.computedHeartRate + " C " + this.heartBeatCount + " Tn " + this.heartBeatEventTime;

    function addRRInterval(msg) {
        if (this.RRInterval)
            return " RR " + this.RRInterval.toFixed(1) + " ms";
        else
            return "";
    }

    switch (this.number) {
        case 4:
            msg += " Tn-1 " + this.previousHeartBeatEventTime + " T-Tn-1 " + (this.heartBeatEventTime - this.previousHeartBeatEventTime);
            msg += addRRInterval.bind(this)();
            break;

        case 3:
            msg += " HW ver. " + this.hardwareVersion + " SW ver. " + this.softwareVersion + " Model " + this.modelNumber;
            break;

        case 2:
            msg += " Manufacturer " + this.manufacturerID + " serial num. : " + this.serialNumber;
            break;

        case 1:
            msg += " Cumulative operating time  " + this.cumulativeOperatingTime + " s = " + (this.cumulativeOperatingTime / 3600).toFixed(1) + " h";
            break;

        case 0:
            msg += addRRInterval.bind(this)();
            break;

        default:
            msg += "Unknown page number " + this.number;
            break;


    }

    return msg + " " + this.channelId.toString();
};

// Parses common fields for all pages
Page.prototype.parseCommon = function (data) {
    // Next 3 bytes are the same for every data page. (ANT+ HRM spec. p. 14, section 5.3)

    this.changeToggle = (data[0] & 0x80) >> 7;

    // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
    this.heartBeatEventTime = data.readUInt16LE(4);

    // Counter for each heart beat event, rollover 255 counts
    this.heartBeatCount = data[6];

    // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
    this.computedHeartRate = data[7];
}

// Parses ANT+ pages the device uses paging
Page.prototype.parse = function (broadcast, previousPage, usesPages) {

    var data = broadcast.data;

    if (usesPages)
        this.number = data[0] & 0x7F;  // Bit 6-0, -> defines the definition of the following 3 bytes (byte 1,2,3)
    else
        this.number = 0;

    switch (this.number) {

        case 4:
            // Main data page

            this.type = "Main";

            this.previousHeartBeatEventTime = data.readUInt16LE(2);

            // Only calculate RR if there is less than 64 seconds between data pages and 1 beat difference between last reception of page
            if (previousPage.timestamp && (this.timestamp - previousPage.timestamp) < 64000)
                this.setRRInterval(previousPage.heartBeatCount, previousPage.heartBeatEventTime);

            break;

        case 3: // Background data page
            this.type = "Background";

            this.hardwareVersion = data[1];
            this.softwareVersion = data[2];
            this.modelNumber = data[3];

            break;

        case 2: // Background data page - sent every 65'th message
            this.type = "Background";

            this.manufacturerID = data[1];
            this.serialNumber = data.readUInt16LE(2); // Upper 16-bits of a 32 bit serial number

            // Set the lower 2-bytes of serial number, if available in channel Id.
            if (typeof broadcast.channelId !== "undefined" && typeof broadcast.channelId.deviceNumber !== "undefined")
                this.serialNumber = (this.serialNumber << 16) | broadcast.channelId.deviceNumber;

            break;

        case 1: // Background data page
            this.type = "Background";

            this.cumulativeOperatingTime = (data.readUInt32LE(1) & 0x00FFFFFF) * 2; // Seconds since reset/battery replacement

            break;

        case 0: // Old legacy 
            this.type = "Main";
            delete this.changeToggle; // Doesnt use paging for bytes 1-3

            if (typeof previousPage.heartBeatCount !== "undefined")
                this.setRRInterval(previousPage.heartBeatCount, previousPage.heartBeatEventTime);

            break;



        default:
            throw new Error("Page " + this.number + " not supported");
            //break;
    }
}

// Page as JSON
Page.prototype.getJSON = function () {
    return JSON.stringify(
             {
                 type: 'page',
                 page: this
             });
}

// Set RR interval based on previous heart event time and heart beat count
Page.prototype.setRRInterval = function (previousHeartBeatCount, previousHeartBeatEventTime) {
    var heartBeatCountDiff = this.heartBeatCount - previousHeartBeatCount,
        heartBeatEventTimeDiff;

    if (heartBeatCountDiff < 0)  // Toggle 255 -> 0
        heartBeatCountDiff += 256;

    if (heartBeatCountDiff === 1) {
        heartBeatEventTimeDiff = this.heartBeatEventTime - previousHeartBeatEventTime;

        if (heartBeatEventTimeDiff < 0) // Roll over
            heartBeatEventTimeDiff += 0xFFFF;

        if (typeof this.previousHeartBeatEventTime === "undefined")  // Old legacy format doesnt have previous heart beat event time
            this.previousHeartBeatEventTime = previousHeartBeatEventTime;

        this.RRInterval = (heartBeatEventTimeDiff / 1024) * 1000; // ms.

    }
}

function DeviceProfile_HRM(configuration) {
    //console.log("HRM configuration", configuration);
    DeviceProfile.call(this, configuration);
    // networkkey : {
    // "ANTPlus" : ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"]
    // "public" : ["0x00", "0x00", "0x00", "0x00", "0x00", "0x00", "0x00", "0x00"]
    // }
    this.addConfiguration("slave", {
        // networkKey : "ANTPlus"
        networkKey: ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"],
        //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
        channelType: "slave",
        channelId: { deviceNumber: '*', deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType: '*' },
        RFfrequency: 57,     // 2457 Mhz ANT +
        LPsearchTimeout: 24, // 60 seconds
        HPsearchTimeout: 10, // 25 seconds n*2.5 s
        //transmitPower: 3,
        //channelTxPower : 3,
        channelPeriod: 8070, // HRM
        //channelPeriod : 8086, //SPDCAD
        proximitySearch: 10,   // 0 - disabled 1 (nearest) - 10 (farthest)
        broadcastScriptFileName : './deviceProfile/deviceProfileHRM.js'

    });

    this.addConfiguration("slave16140", {
        networkKey: ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"],
        //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
        channelType: "slave",
        channelId: { deviceNumber: '*', deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType: '*' },
        RFfrequency: 57,     // 2457 Mhz ANT +
        LPsearchTimeout: 24, // 60 seconds
        HPsearchTimeout: 10, // 25 seconds n*2.5 s
        //transmitPower: 3,
        //channelTxPower : 3,
        channelPeriod: 8070 * 2, // HRM
        //channelPeriod : 8086, //SPDCAD
        proximitySearch: 10   // 0 - disabled 1 (nearest) - 10 (farthest)

    });

    this.addConfiguration("slave32280", {
        networkKey: ["0xB9", "0xA5", "0x21", "0xFB", "0xBD", "0x72", "0xC3", "0x45"],
        //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
        channelType: "slave",
        channelId: { deviceNumber: '*', deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType: '*' },
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
    this.on(DeviceProfile_HRM.prototype.EVENT.LOG, this.showLog);

    this.duplicateMessageCounter = 0;

    this.receivedBroadcastCounter = 0;

    // "Objects are always considered having different class if they don't have exactly the same set of properties in the same order."
    // http://codereview.stackexchange.com/questions/28344/should-i-put-default-values-of-attributes-on-the-prototype-to-save-space/28360#28360
    // "fields that are added to an object outside constructor or object literal, will not be stored directly on the object but in an array external to the object."
    // http://stackoverflow.com/questions/17925726/clearing-up-the-hidden-classes-concept-of-v8
    // http://thibaultlaurens.github.io/javascript/2013/04/29/how-the-v8-engine-works/
    
    this.previousPage = new Page();

    this.usesPages = false;

}

//DeviceProfile_HRM.prototype = Object.create(DeviceProfile.prototype); 
//DeviceProfile_HRM.prototype.constructor = DeviceProfile_HRM; 
util.inherits(DeviceProfile_HRM, DeviceProfile);

DeviceProfile_HRM.prototype.STATE = {
    HR_EVENT: 1,
    NO_HR_EVENT: 0,// Sets computed heart rate to invalid = 0x00, after a timeout of 5 seconds
};
DeviceProfile_HRM.prototype.NAME = 'HRM';

DeviceProfile_HRM.prototype.DEVICE_TYPE = 0x78;
// Ca. 4 messages pr. second, or 1 msg. pr 246.3 ms -> max HR supported 246.3 pr/minute 
DeviceProfile_HRM.prototype.CHANNEL_PERIOD = 8070;

DeviceProfile_HRM.prototype.EVENT = {
    BROADCAST: 'broadcast',
    CHANNEL_RESPONSE_RF_EVENT: 'channelResponseRFEvent',
    PAGE : 'page',
    LOG : 'log'
    //RESPONSE: 'response',
    //RF_EVENT: 'RFevent'
};

DeviceProfile_HRM.prototype.showLog = function (msg)
{
    console.log(Date.now(),msg);
}

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

// HRM sends out pages in page 4 * 64, background page 1 (for 1 second), page 4 *64, background page 2 (1 s.), page 4*64, background page 3 (1 s),....
// When no HR data is sent from HR sensor, only background pages are sent each channel period; b1*64,b2*64,b3*64,b1*64,..... in accordance with the
// normal behaviour of a broadcast master -> just repeat last broadcast if no new data available, then go to sleep if no HR data received in {timeout} millisec.
// It seems like the {timeout} of HRM sensor "GARMIN HRM2-SS" is 2 minutes.

DeviceProfile_HRM.prototype.broadCastDataParser = function (broadcast) {
    //console.timeEnd('usbtoprofile'); // Typical 1 ms - max. 3 ms, min 0 ms. 
    //console.time('broadcast'); // Min. 1 ms - max 7 ms // Much, much faster than the channel period
    var
        data = broadcast.data,
           //deviceId = "DN_" + this.broadcast.channelId.deviceNumber + "DT_" + this.broadcast.channelId.deviceType + "T_" + this.broadcast.channelId.transmissionType,
           heartBeatCountDiff,
           heartBeatEventTimeDiff,
           TIMEOUT_CLEAR_COMPUTED_HEARTRATE = 5000,
           previousBroadcastDataCopy,
           dataCopy = new Buffer(data.length),
           RXTimestamp_Difference,
           JSONPage,
           previousRXTimestamp_Difference,
           page = new Page(broadcast); // Page object is polymorphic (variable number of properties based on ANT+ page format)

    this.receivedBroadcastCounter++;

    if (broadcast.channelId.deviceType !== DeviceProfile_HRM.prototype.DEVICE_TYPE) {
        this.emit(DeviceProfile_HRM.prototype.EVENT.LOG,"Received broadcast from non HRM device type 0x"+ broadcast.channelId.deviceType.toString(16)+ " routing of broadcast is wrong!");
        return;
    }

    //if (typeof this.usesANTPLUSGlobalDataPages === "undefined") {
    //    this.usesANTPLUSGlobalDataPages = broadcast.channelId.usesANTPLUSGlobalDataPages();
    //    if (this.usesANTPLUSGlobalDataPages)
    //        this.emit(DeviceProfile_HRM.prototype.EVENT.LOG, "HRM ANT+ global data pages are used, but no support for intepretation here.");
    //    else
    //        this.emit(DeviceProfile_HRM.prototype.EVENT.LOG, "HRM ANT+ global data pages not used.");
    //}

    //// Estimate channel period for master if RX timestamp extended broadcast information is available
    //if (broadcast.RXTimestamp) {
    //    if (typeof this.previousRXTimestamp === "undefined")
    //        this.previousRXTimestamp = broadcast.RXTimestamp.timestamp;
    //    else {
    //        previousRXTimestamp_Difference = this.RXTimestamp_Difference;
    //        this.RXTimestamp_Difference = broadcast.RXTimestamp.timestamp - this.previousRXTimestamp;
    //        if (RXTimestamp_Difference < 0)
    //            this.RXTimestamp_Difference += 0xFFFF;
    //        this.page.channelPeriod = this.RXTimestamp_Difference;
    //        this.page.channelPeriodHz = 32768 / this.RXTimestamp_Difference;
    //        this.previousRXTimestamp = broadcast.RXTimestamp.timestamp;

    //        if (typeof previousRXTimestamp_Difference === "undefined")
    //            this.emit(DeviceProfile_HRM.prototype.EVENT.LOG, "HRM channel "+broadcast.channel+" channel period " + this.page.channelPeriod + " " + this.page.channelPeriodHz.toFixed(2) + " Hz");
    //    }
    //}

    //this.broadcast = broadcast;
    //console.log(Date.now(), "C# " + broadcast.channel, broadcast.toString());

    // "The transmitter toggles the state of the toggle bit every fourth message if the transmitter is using any 
    // of the page formats other than the page 0 data format -> page 4 format". (ANT Device Profile HRM, p. 14) 
    // "The receiver may not interpret bytes 0-3 until it has seen this bit set to both a 0 and a 1" (ANT+ HRM spec, p. 15) 
    // http://www.thisisant.com/forum/viewthread/3896/

    if (!this.usesPages) {

        if (typeof this.previousPage.changeToggle !== "undefined" && (page.changeToggle !== this.previousPage.changeToggle)) {
            this.usesPages = true;
            this.emit(DeviceProfile_HRM.prototype.EVENT.LOG, 'HRM uses ANT+ page numbers - page toggle bit (T) transition after '+this.receivedBroadcastCounter+ ' broadcasts');
        }

        this.previousPage.changeToggle = page.changeToggle;
    }
    // FILTER - Skip duplicate messages from same master 

    if (this.previousBroadcastData) {
        previousBroadcastDataCopy= new Buffer(this.previousBroadcastData);
        previousBroadcastDataCopy[0] = previousBroadcastDataCopy[0] & 0x7F; // Don't let page toggle bit obscure string comparison  - mask it please
        dataCopy = new Buffer(data);
        dataCopy[0] = dataCopy[0] & 0x7F;
        if (previousBroadcastDataCopy.toString() === dataCopy.toString()) {
            this.duplicateMessageCounter++;
            return;
        }
    }

    if (this.duplicateMessageCounter > 0) {
        // console.log("Skipped " + this.duplicateMessageCounter + " duplicate messages from "+broadcast.channelId.toString());
        this.duplicateMessageCounter = 0;
    }

    // Set computedHeartRate to invalid (0x00) if heart beat counter stays the same for a specified timeout

    if (page.heartBeatCount === this.previousPage.heartBeatCount) {
        //console.log(Date.now(), "No heart beat event registered"); // One case : happens often for background page page 4 -> page 2 transition

        if (this.state === DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT)
            page.computedHeartRate = 0x00;

        this.timeOutSetInvalidComputedHR = setTimeout(function () {
            this.state = DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT;
            page.computedHeartRate = 0x00; // Set to invalid
        }.bind(this), TIMEOUT_CLEAR_COMPUTED_HEARTRATE);
    }
    else {
        clearTimeout(this.timeOutSetInvalidComputedHR);
        this.state = DeviceProfile_HRM.prototype.STATE.HR_EVENT;
    }

    // this.usesPages = false; // TEST : page 0 simulation
    
     page.parse(broadcast,this.previousPage,this.usesPages);
    
    if (this.receivedBroadcastCounter > 4 || this.usesPages) {

        JSONPage = page.getJSON();

        if (!this.emit(DeviceProfile_HRM.prototype.EVENT.PAGE, JSONPage)) // Let host take care of message, i.e sending on websocket
            this.emit(DeviceProfile_HRM.prototype.EVENT.LOG, 'No listener for event ' + DeviceProfile_HRM.prototype.EVENT.PAGE + " P# " + page.number);

        this.emit(DeviceProfile_HRM.prototype.EVENT.LOG, this.receivedBroadcastCounter+" "+page.toString()+" "+JSONPage);

    }

    // Keep track of previous page state for calculation of RR
    this.previousPage.timestamp = page.timestamp;
    this.previousBroadcastData = data;
    this.previousPage.heartBeatCount = page.heartBeatCount;
    this.previousPage.heartBeatEventTime = page.heartBeatEventTime;

    //console.timeEnd('broadcast');
};

module.exports = DeviceProfile_HRM;