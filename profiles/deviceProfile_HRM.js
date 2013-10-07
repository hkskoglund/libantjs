/* global define: true, setTimeout: true, clearTimeout: true, Uint8Array */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
'use strict'; 

    var DeviceProfile = require('profiles/deviceProfile'),
        Page = require('profiles/HRMPage'),
        setting = require('settings'),
        HighPrioritySearchTimeout = require('messages/HighprioritySearchTimeout'),
        LowPrioritySearchTimeout = require('messages/LowprioritySearchTimeout');
    
   
    
    function DeviceProfile_HRM(configuration) {
        //console.log("HRM configuration", configuration);
        DeviceProfile.call(this, configuration);
        
        this.addConfiguration("slave", {
            description: "Slave configuration for ANT+ HRM device profile",
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            LPsearchTimeout: new LowPrioritySearchTimeout(LowPrioritySearchTimeout.prototype.MAX), // 60 seconds
            HPsearchTimeout: new HighPrioritySearchTimeout(HighPrioritySearchTimeout.prototype.DISABLED), // 25 seconds n*2.5 s
          
            channelPeriod: DeviceProfile_HRM.prototype.CHANNEL_PERIOD_ARRAY
           
        });
        
       
        this.addConfiguration("master", {
             description: "Master configuration for ANT+ HRM device profile",
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "master",
            channelId: { deviceNumber: 'serial number', deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType: 0x01 }, // Independent channel
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            
            channelPeriod: DeviceProfile_HRM.prototype.CHANNEL_PERIOD_DEFAULT
         
    
        });
    
//        this.on(DeviceProfile_HRM.prototype.EVENT.BROADCAST, this.broadCastDataParser);
//        this.on(DeviceProfile_HRM.prototype.EVENT.CHANNEL_RESPONSE_RF_EVENT, this.channelResponseRFevent);
//        this.on(DeviceProfile_HRM.prototype.EVENT.LOG, this.showLog);
    
    
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
        
        this._setTimeoutDeterminePageToggle = function () {
            var  TIMEOUT_DETERMINE_PAGE_TOGGLE = 1500;
            
            this.timeoutPageToggleID = setTimeout(function () {
                if (this.receivedBroadcastCounter >= 2) // Require at least 2 messages to determine if page toggle bit is used
                {
                    this.state.pageToggle = DeviceProfile_HRM.prototype.STATE.NO_PAGE_TOGGLE;
                   this.log.log('log', 'HRM uses legacy format page 0 - page toggle bit (T) not toggeling after ' + this.receivedBroadcastCounter + ' broadcasts');
                }
                else 
                    setTimeout(this._setTimeoutDeterminePageToggle,0);
                
            }.bind(this), TIMEOUT_DETERMINE_PAGE_TOGGLE);
        }.bind(this);
    
    }
    
    DeviceProfile_HRM.prototype = Object.create(DeviceProfile.prototype); 
    DeviceProfile_HRM.prototype.constructor = DeviceProfile_HRM; 
    
    DeviceProfile_HRM.prototype.CHANNEL_PERIOD_DEFAULT = 8070;
    DeviceProfile_HRM.prototype.CHANNEL_PERIOD_ARRAY = [
        DeviceProfile_HRM.prototype.CHANNEL_PERIOD_DEFAULT, 
        DeviceProfile_HRM.prototype.CHANNEL_PERIOD_DEFAULT*2,
        DeviceProfile_HRM.prototype.CHANNEL_PERIOD_DEFAULT*4
    ];
    
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
    
    
    
//    DeviceProfile_HRM.prototype.EVENT = {
//        BROADCAST: 'broadcast',
//        CHANNEL_RESPONSE_RF_EVENT: 'channelResponseRFEvent',
//        PAGE : 'page',
//        LOG : 'log'
//        //RESPONSE: 'response',
//        //RF_EVENT: 'RFevent'
//    };
    
    
    DeviceProfile_HRM.prototype.channelResponse = function (channelResponse) {
           // this.log.log('log', 'HRM got', channelResponse);
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
    
    DeviceProfile_HRM.prototype.broadCast = function (broadcast) {
        //console.timeEnd('usbtoprofile'); // Typical 1 ms - max. 3 ms, min 0 ms. 
        //console.time('broadcast'); // Min. 1 ms - max 7 ms // Much, much faster than the channel period
        var
            data = broadcast.data,
               //deviceId = "DN_" + this.broadcast.channelId.deviceNumber + "DT_" + this.broadcast.channelId.deviceType + "T_" + this.broadcast.channelId.transmissionType,
               TIMEOUT_CLEAR_COMPUTED_HEARTRATE = 5000,
            
          
//               previousBroadcastDataCopy,
//               dataCopy = new Uint8Array(data.length),
               RXTimestamp_Difference,
//               JSONPage,
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
    
        
    
        if (this.state.pageToggle === DeviceProfile_HRM.prototype.STATE.DETERMINE_PAGE_TOGGLE) {
    
            if (typeof this.previousPage.changeToggle === "undefined")
                this._setTimeoutDeterminePageToggle();
    
            if (page.changeToggle !== this.previousPage.changeToggle) {
                clearTimeout(this.timeoutPageToggleID);
                this.state.pageToggle = DeviceProfile_HRM.prototype.STATE.PAGE_TOGGLE;
                this.log.log('log', 'HRM uses ANT+ pages - page toggle bit (T) transition after '+this.receivedBroadcastCounter+ ' broadcasts');
            }
    
        }
       
        if (this.isDuplicateMessage(data,0x7F)) // Disregard/Mask bit 7 - Page toggle bit
            return;
        
        // Set computedHeartRate to invalid (0x00) if heart beat counter stays the same for a specified timeout
    
        if (page.heartBeatCount === this.previousPage.heartBeatCount) {
            //console.log(Date.now(), "No heart beat event registered"); // One case : happens often for background page page 4 -> page 2 transition
    
            if (this.state.heartRateEvent === DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT)
                page.computedHeartRate = INVALID_HEART_RATE;
    
       
//            this.timeOutSetInvalidComputedHR = setTimeout(function () {
//                this.log.log('warn','No heart rate event registered in the last ',TIMEOUT_CLEAR_COMPUTED_HEARTRATE+ 'ms.');
//                this.state.heartRateEvent = DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT;
//                page.computedHeartRate = INVALID_HEART_RATE; 
//            }.bind(this), TIMEOUT_CLEAR_COMPUTED_HEARTRATE);
            else 
                if (this.lastHREventTime && (Date.now() > this.lastHREventTime+TIMEOUT_CLEAR_COMPUTED_HEARTRATE))
                {
                    this.log.log('warn','No heart rate event registered in the last ',TIMEOUT_CLEAR_COMPUTED_HEARTRATE+ 'ms.');
                    this.state.heartRateEvent = DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT;
                    page.computedHeartRate = INVALID_HEART_RATE; 
                }
        }
        else {
            // Chrome Version 32.0.1657.2 canary Aura Web: Hmm, some times timeout is not cleared....
            // Node : Seemed to work
            // MDN : https://developer.mozilla.org/en-US/docs/Web/API/Window.setTimeout
            // " Code executed by setTimeout() is run in a separate execution context to the function from which it was called"
            // "It's important to note that the function or code snippet cannot be executed until the thread that called setTimeout() has terminated"
            //clearTimeout(this.timeOutSetInvalidComputedHR);
            this.lastHREventTime = Date.now();
            this.state.heartRateEvent = DeviceProfile_HRM.prototype.STATE.HR_EVENT;
          
        }
    
        if (this.state.pageToggle !== DeviceProfile_HRM.prototype.STATE.DETERMINE_PAGE_TOGGLE) {
    
            page.parse(broadcast, this.previousPage, this.state.pageToggle === DeviceProfile_HRM.prototype.STATE.PAGE_TOGGLE);
    
            //JSONPage = page.getJSON();
            
           
            this.log.log('log', this.receivedBroadcastCounter+" "+page.toString());
            
            this.onPage(page);
    
        }
    
        // Keep track of previous page state for calculation of RR
        this.previousPage.timestamp = page.timestamp;
        this.previousBroadcastData = data;
        this.previousPage.heartBeatCount = page.heartBeatCount;
        this.previousPage.heartBeatEventTime = page.heartBeatEventTime;
        this.previousPage.changeToggle = page.changeToggle;
    
        //return JSONPage;
        
        //console.timeEnd('broadcast');
    };
    
    module.exports = DeviceProfile_HRM;
        
    return module.exports;
});