var DeviceProfile = require('./deviceProfile.js'),
    util = require('util');

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

    this.previousReceivedTimestamp = -1; // Timestamp for last reception of broadcast for specific channel Id device number
    this.previousHeartBeatCount = -1; // Heart Beat Count of previous reception for specific channel Id device number
    this.previousBroadcastData = -1;

    this.duplicateMessageCounter = 0;

    //this.previousPageChangeToggle = -1;

    this.broadcastCounter = 0;

    // Maybe optimize the "hidden classes" used for property lookup in V8 by introducing common properties for all pages
    // "Objects are always considered having different class if they don't have exactly the same set of properties in the same order."
    // http://codereview.stackexchange.com/questions/28344/should-i-put-default-values-of-attributes-on-the-prototype-to-save-space/28360#28360
    // "fields that are added to an object outside constructor or object literal, will not be stored directly on the object but in an array external to the object."
    // http://stackoverflow.com/questions/17925726/clearing-up-the-hidden-classes-concept-of-v8
    // http://thibaultlaurens.github.io/javascript/2013/04/29/how-the-v8-engine-works/
    this.page = {
        heartBeatEventTime :  0,
        heartBeatCount : 0,
        computedHeartRate : 0,
        changeToggle : 0,
        number : 0 // Assume legacy format
    };

    this.usesPages = false;

    

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


DeviceProfile_HRM.prototype.toString = function () {
    var msg = this.broadcastCounter+" "+ this.page.type + " P# " + this.page.number + " T " + this.page.changeToggle + " HR " + this.page.computedHeartRate + " C " + this.page.heartBeatCount +
                " Tn " + this.page.heartBeatEventTime;

    switch (this.page.number) {
        case 4:
            msg += " Tn-1 " + this.page.previousHeartBeatEventTime + " T-Tn-1 " + (this.page.heartBeatEventTime - this.page.previousHeartBeatEventTime);
            if (this.page.RRInterval)
                msg += " RR " + this.page.RRInterval.toFixed(1) + " ms";
            break;

        case 3:
            msg += " HW ver. " + this.page.hardwareVersion + " SW ver. " + this.page.softwareVersion + " Model " +
                        this.page.modelNumber;
            break;

        case 2:
            msg += " Manufacturer " + this.page.manufacturerID + " serial num. : " + this.page.serialNumber;
            break;

        case 1:
            msg += " Cumulative operating time  " + this.page.cumulativeOperatingTime + " s = " + (this.page.cumulativeOperatingTime / 3600).toFixed(1)+ " h";
            break;

        case 0:
            msg += "Main";
            break;

        default:
            msg += "Unknown page number " + this.page.number;
            break;


    }

    return msg + " " + this.broadcast.channelId.toString();
};

DeviceProfile_HRM.prototype.STATE = {
    HR_EVENT: 1,
    NO_HR_EVENT: 0,// Sets computed heart rate to invalid = 0x00, after a timeout of 5 seconds
};

// HRM sends out pages in page 4 * 64, background page 1 (for 1 second), page 4 *64, background page 2 (1 s.), page 4*64, background page 3 (1 s),....
// When no HR data is sent from HR sensor, only background pages are sent each channel period; b1*64,b2*64,b3*64,b1*64,..... in accordance with the
// normal behaviour of a broadcast master -> just repeat last broadcast if no new data available, then go to sleep if no HR data received in {timeout} millisec.
// It seems like the {timeout} of HRM sensor "GARMIN HRM2-SS" is 2 minutes.

DeviceProfile_HRM.prototype.broadCastDataParser = function (broadcast) {
    //console.timeEnd('usbtoprofile'); // Typical 1 ms - max. 3 ms, min 0 ms. 
    //console.time('broadcast'); // Min. 1 ms - max 7 ms // Much, much faster than the channel period
    var data = broadcast.data,
           //deviceId = "DN_" + this.broadcast.channelId.deviceNumber + "DT_" + this.broadcast.channelId.deviceType + "T_" + this.broadcast.channelId.transmissionType,
           heartBeatCountDiff,
           heartBeatEventTimeDiff,
           TIMEOUT_CLEAR_COMPUTED_HEARTRATE = 5000,
           previousBroadcastDataCopy,
           dataCopy = new Buffer(data.length),
           RXTimestamp_Difference,
           JSONPage;

    if (broadcast.channelId.deviceType !== DeviceProfile_HRM.prototype.DEVICE_TYPE) {
        this.emit(DeviceProfile_HRM.prototype.EVENT.LOG,"Received broadcast from non HRM device type 0x"+ broadcast.channelId.deviceType.toString(16)+ " routing of broadcast is wrong!");
        return;
    }

    if (broadcast.channelId.usesANTPLUSGlobalDataPages())
        this.emit(DeviceProfile_HRM.prototype.EVENT.LOG,"Seems like ANT+ global data pages are used, but no support for intepretation here.");

   

    // Estimate channel period for master if RX timestamp extended broadcast information is available
    if (broadcast.RXTimestamp) {
        if (typeof this.previousRXTimestamp === "undefined")
            this.previousRXTimestamp = broadcast.RXTimestamp.timestamp;
        else {
            RXTimestamp_Difference = broadcast.RXTimestamp.timestamp - this.previousRXTimestamp;
            if (RXTimestamp_Difference < 0)
                RXTimestamp_Difference += 0xFFFF;
            this.page.channelPeriod = RXTimestamp_Difference;
            this.page.channelPeriodHz = 32768 / RXTimestamp_Difference;
            this.previousRXTimestamp = broadcast.RXTimestamp.timestamp;
        }
    }

    this.broadcastCounter++;

    this.broadcast = broadcast;
    //console.log(Date.now(), "C# " + broadcast.channel, broadcast.toString());
   
    // Next 3 bytes are the same for every data page. (ANT+ HRM spec. p. 14, section 5.3)

    // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
    this.page.heartBeatEventTime = data.readUInt16LE(4);

    // Counter for each heart beat event, rollover 255 counts
    this.page.heartBeatCount = data[6];

    // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
    this.page.computedHeartRate = data[7];

    // Filter ONE - page toggle bit observation for page format other than 0 (newer HRM)

    // "The transmitter toggles the state of the toggle bit every fourth message (~1Hz) if the transmitter is using any 
    // of the page formats other than the page 0 data format -> page 4 format". (ANT Device Profile HRM, p. 14) 
    // 0000111100001111 pattern
    // "The receiver may not interpret bytes 0-3 until it has seen this bit set to both a 0 and a 1" (ANT+ HRM spec, p. 15) 
    // http://www.thisisant.com/forum/viewthread/3896/

    if (!this.usesPages) {

        this.page.changeToggle = (data[0] & 0x80) >> 7; // Bit 7    MSB

        if (typeof this.previousPageChangeToggle !== "undefined" && (this.page.changeToggle !== this.previousPageChangeToggle)) {
            this.usesPages = true;
            this.emit(DeviceProfile_HRM.prototype.EVENT.LOG, 'HRM uses pages - observed page toggle bit transition after '+this.broadcastCounter+ ' broadcasts');
        }

        this.previousPageChangeToggle = this.page.changeToggle;
    }
    // FILTER TWO - Skip duplicate messages from same master 

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

    if (this.page.heartBeatCount === this.previousHeartBeatCount) {
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

    this.page.timestamp = Date.now();
    this.page.channelId = broadcast.channelId;

    // Only intepret page number and byte 1,2,3 if HRM uses paging
    if (this.usesPages) {

        this.page.number = data[0] & 0x7F;  // Bit 6-0, -> defines the definition of the following 3 bytes (byte 1,2,3)

        switch (this.page.number) {

            case 4:
                // Main data page

                this.page.type = "Main";

                this.page.previousHeartBeatEventTime = data.readUInt16LE(2);

                // Only calculate RR if there is less than 64 seconds between data pages and 1 beat difference between last reception of page
                if (this.previousReceivedTimestamp && (this.page.timestamp - this.previousReceivedTimestamp) < 64000) {


                    heartBeatCountDiff = this.page.heartBeatCount - this.previousHeartBeatCount;
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


            default:
                throw new Error("Page " + this.page.number + " not supported");
                //break;
        }
    }

    //case 0: // Main - unknown data format, transmitter shall set the value to 0xFF for bytes 1,2,3
    //    this.page.type = "Main";
    //    break;

    if (this.broadcastCounter > 4 || this.usesPages) {

        JSONPage = JSON.stringify(
            {
                type: 'page',
                page: this.page
            });

        if (!this.emit(DeviceProfile_HRM.prototype.EVENT.PAGE, JSONPage)) // Let host take care of sending message on websocket
            this.emit(DeviceProfile_HRM.prototype.EVENT.LOG, 'No listener for event ' + DeviceProfile_HRM.prototype.EVENT.PAGE + " P# " + this.page.number);

        this.emit(DeviceProfile_HRM.prototype.EVENT.LOG, this.toString());

    }

    this.previousReceivedTimestamp = this.page.timestamp;
    this.previousBroadcastData = data;
    this.previousHeartBeatCount = this.page.heartBeatCount;

    //console.timeEnd('broadcast');
   
};

module.exports = DeviceProfile_HRM;