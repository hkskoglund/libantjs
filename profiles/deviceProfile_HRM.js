if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
'use strict'; 

    var DeviceProfile = require('profiles/deviceProfile'),
        Page = require('profiles/HRMPage'),
        setting = require('settings');
    
    function DeviceProfile_HRM(configuration) {
        //console.log("HRM configuration", configuration);
        DeviceProfile.call(this, configuration);
        
        this.addConfiguration("slave", {
           
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
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
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            LPsearchTimeout: 24, // 60 seconds
            HPsearchTimeout: 10, // 25 seconds n*2.5 s
            //transmitPower: 3,
            //channelTxPower : 3,
            channelPeriod: 8070 * 2, // HRM
            //channelPeriod : 8086, //SPDCAD
            proximitySearch: 10   // 0 - disabled 1 (nearest) - 10 (farthest)
    
        });
    
        this.addConfiguration("slave32280", {
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            LPsearchTimeout: 24, // 60 seconds
            HPsearchTimeout: 10, // 25 seconds n*2.5 s
            //transmitPower: 3,
            //channelTxPower : 3,
            channelPeriod: 8070 * 4, // HRM
            //channelPeriod : 8086, //SPDCAD
            proximitySearch: 10   // 0 - disabled 1 (nearest) - 10 (farthest)
    
        });
    
        this.addConfiguration("master", {
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "master",
            channelId: { deviceNumber: 'serial number', deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType: 0x01 }, // Independent channel
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            //LPsearchTimeout: 24, // 60 seconds
            //HPsearchTimeout: 10, // 25 seconds n*2.5 s
            //transmitPower: 3,
            //channelTxPower : 3,
            channelPeriod: 8070, // HRM
            //channelPeriod : 8086, //SPDCAD
            //proximitySearch: 10   // 0 - disabled 1 (nearest) - 10 (farthest)
    
        });
    
//        this.on(DeviceProfile_HRM.prototype.EVENT.BROADCAST, this.broadCastDataParser);
//        this.on(DeviceProfile_HRM.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, this.channelResponseRFevent);
//        this.on(DeviceProfile_HRM.prototype.EVENT.LOG, this.showLog);
    
        this.duplicateMessageCounter = 0;
    
        this.receivedBroadcastCounter = 0;
    
        // "Objects are always considered having different class if they don't have exactly the same set of properties in the same order."
        // http://codereview.stackexchange.com/questions/28344/should-i-put-default-values-of-attributes-on-the-prototype-to-save-space/28360#28360
        // "fields that are added to an object outside constructor or object literal, will not be stored directly on the object but in an array external to the object."
        // http://stackoverflow.com/questions/17925726/clearing-up-the-hidden-classes-concept-of-v8
        // http://thibaultlaurens.github.io/javascript/2013/04/29/how-the-v8-engine-works/
        
        this.previousPage = new Page();
    
        this.usesPages = false;
    
        this.state = {
            heartRateEvent: DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT,
            pageToggle : DeviceProfile_HRM.prototype.STATE.DETERMINE_PAGE_TOGGLE, // Uses page toggle bit
        };
    
    }
    
    DeviceProfile_HRM.prototype = Object.create(DeviceProfile.prototype); 
    DeviceProfile_HRM.prototype.constructor = DeviceProfile_HRM; 
    
    DeviceProfile_HRM.prototype.STATE = {
        HR_EVENT: 1,
        NO_HR_EVENT: 0,// Sets computed heart rate to invalid = 0x00, after a timeout of 5 seconds
        DETERMINE_PAGE_TOGGLE: 1,
        NO_PAGE_TOGGLE: 0,
        PAGE_TOGGLE: 2
    };
    DeviceProfile_HRM.prototype.NAME = 'HRM';
    
    DeviceProfile_HRM.prototype.DEVICE_TYPE = 0x78;
    // Ca. 4 messages pr. second, or 1 msg. pr 246.3 ms -> max HR supported 246.3 pr/minute 
    DeviceProfile_HRM.prototype.CHANNEL_PERIOD = 8070;
    
//    DeviceProfile_HRM.prototype.EVENT = {
//        BROADCAST: 'broadcast',
//        CHANNEL_RESPONSE_RF_EVENT: 'channelResponseRFEvent',
//        PAGE : 'page',
//        LOG : 'log'
//        //RESPONSE: 'response',
//        //RF_EVENT: 'RFevent'
//    };
    
    
    DeviceProfile_HRM.prototype.channelResponseRFevent = function (channelResponse) {
        if (channelResponse.RFEvent)
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
               TIMEOUT_CLEAR_COMPUTED_HEARTRATE = 5000,
               TIMEOUT_DETERMINE_PAGE_TOGGLE = 1500,
               TIMEOUT_DUPLICATE_MESSAGE_WARNING = 3000, 
               previousBroadcastDataCopy,
               dataCopy = new Buffer(data.length),
               RXTimestamp_Difference,
               JSONPage,
               previousRXTimestamp_Difference,
               page = new Page(broadcast),// Page object is polymorphic (variable number of properties based on ANT+ page format)
               INVALID_HEART_RATE = 0x00; 
    
        this.receivedBroadcastCounter++;
    
        if (broadcast.channelId.deviceType !== DeviceProfile_HRM.prototype.DEVICE_TYPE) {
            this.log.log('log',"Received broadcast from non HRM device type 0x"+ broadcast.channelId.deviceType.toString(16)+ " routing of broadcast is wrong!");
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
    
        // console.log("PAGE toggle", this.state.pageToggle);
    
        var setTimeoutDeterminePageToggle = function () {
           
            this.timeoutPageToggleID = setTimeout(function () {
                if (this.receivedBroadcastCounter >= 2) // Require at least 2 messages to determine if page toggle bit is used
                {
                    this.state.pageToggle = DeviceProfile_HRM.prototype.STATE.NO_PAGE_TOGGLE;
                   this.log.log('log', 'HRM uses legacy format page 0 - page toggle bit (T) not toggeling after ' + this.receivedBroadcastCounter + ' broadcasts');
                }
                else 
                    setTimeout(setTimeoutDeterminePageToggle,0);
                
            }.bind(this), TIMEOUT_DETERMINE_PAGE_TOGGLE);
        }.bind(this);
    
        if (this.state.pageToggle === DeviceProfile_HRM.prototype.STATE.DETERMINE_PAGE_TOGGLE) {
    
            if (typeof this.previousPage.changeToggle === "undefined")
                setTimeoutDeterminePageToggle.bind(this)();
    
            if (page.changeToggle !== this.previousPage.changeToggle) {
                clearTimeout(this.timeoutPageToggleID);
                this.state.pageToggle = DeviceProfile_HRM.prototype.STATE.PAGE_TOGGLE;
                this.log.log('log', 'HRM uses ANT+ pages - page toggle bit (T) transition after '+this.receivedBroadcastCounter+ ' broadcasts');
            }
    
        }
    
        // FILTER - Skip duplicate messages from same master 
    
        if (this.previousBroadcastData) {
            previousBroadcastDataCopy= new Buffer(this.previousBroadcastData);
            previousBroadcastDataCopy[0] = previousBroadcastDataCopy[0] & 0x7F; // Don't let page toggle bit obscure string comparison  - mask it please
            dataCopy = new Buffer(data);
            dataCopy[0] = dataCopy[0] & 0x7F;
            if (previousBroadcastDataCopy.toString() === dataCopy.toString()) {
                this.currentTime = Date.now();
    
                if (this.duplicateMessageCounter === 0)
                    this.duplicateMessageStartTime = this.currentTime;
    
                if (this.currentTime - this.duplicateMessageStartTime >= TIMEOUT_DUPLICATE_MESSAGE_WARNING) {
                    this.duplicateMessageStartTime = this.currentTime;
                    this.log.log('log',"Duplicate message registered for " + TIMEOUT_DUPLICATE_MESSAGE_WARNING + " ms, may indicate lost heart rate data");
                }
    
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
    
            if (this.state.heartRateEvent === DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT)
                page.computedHeartRate = INVALID_HEART_RATE;
    
            this.timeOutSetInvalidComputedHR = setTimeout(function () {
                this.state.heartRateEvent = DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT;
                page.computedHeartRate = INVALID_HEART_RATE; 
            }.bind(this), TIMEOUT_CLEAR_COMPUTED_HEARTRATE);
        }
        else {
            clearTimeout(this.timeOutSetInvalidComputedHR);
            this.state.heartRateEvent = DeviceProfile_HRM.prototype.STATE.HR_EVENT;
        }
    
        if (this.state.pageToggle !== DeviceProfile_HRM.prototype.STATE.DETERMINE_PAGE_TOGGLE) {
    
            page.parse(broadcast, this.previousPage, this.state.pageToggle === DeviceProfile_HRM.prototype.STATE.PAGE_TOGGLE);
    
            JSONPage = page.getJSON();
//    
//            if (!this.emit(DeviceProfile_HRM.prototype.EVENT.PAGE, JSONPage)) // Let host take care of message, i.e sending on websocket
//                this.emit(DeviceProfile_HRM.prototype.EVENT.LOG, 'No listener for event ' + DeviceProfile_HRM.prototype.EVENT.PAGE + " P# " + page.number);
//    
            this.log.log('log', this.receivedBroadcastCounter+" "+page.toString());
    
        }
    
        // Keep track of previous page state for calculation of RR
        this.previousPage.timestamp = page.timestamp;
        this.previousBroadcastData = data;
        this.previousPage.heartBeatCount = page.heartBeatCount;
        this.previousPage.heartBeatEventTime = page.heartBeatEventTime;
        this.previousPage.changeToggle = page.changeToggle;
    
        //console.timeEnd('broadcast');
    };
    
    module.exports = DeviceProfile_HRM;
        
    return module.exports;
});