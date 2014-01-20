/* global define: true, setTimeout: true, clearTimeout: true, Uint8Array: true, DataView: true */
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
'use strict'; 

    var DeviceProfile = require('profiles/deviceProfile'),
       // Page = require('profiles/HRMPage'),
        HRMPage4 = require('profiles/hrm/HRMPage4'),
        HRMPage0 = require('profiles/hrm/HRMPage0'), // Old legacy format
        HRMPage1 = require('profiles/hrm/HRMPage1'),
        HRMPage2 = require('profiles/hrm/HRMPage2'),
        HRMPage3 = require('profiles/hrm/HRMPage3'),
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
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_HRM.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: '*' },
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
            channelId: { deviceNumber: 'serial number', deviceType: DeviceProfile_HRM.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: DeviceProfile_HRM.prototype.CHANNEL_ID.TRANSMISSION_TYPE }, // Independent channel
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            
            channelPeriod: DeviceProfile_HRM.prototype.CHANNEL_PERIOD_DEFAULT
         
    
        });
  
        // "Objects are always considered having different class if they don't have exactly the same set of properties in the same order."
        // http://codereview.stackexchange.com/questions/28344/should-i-put-default-values-of-attributes-on-the-prototype-to-save-space/28360#28360
        // "fields that are added to an object outside constructor or object literal, will not be stored directly on the object but in an array external to the object."
        // http://stackoverflow.com/questions/17925726/clearing-up-the-hidden-classes-concept-of-v8
        // http://thibaultlaurens.github.io/javascript/2013/04/29/how-the-v8-engine-works/
        
//        this.previousPage = new Page();
    
        this.state = {
            heartRateEvent: DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT,
        };
        
        // Purpose : More performance - does not need to generate a new HRM page Object for each broadcast
        // Profiling of new HRMPage4 -> does not take long to execute -> keep new HRMPage ...
        //this.hrmPage4 = new HRMPage4({log : true});
        
        
        
        
        this.previousBroadcastData = undefined;

        this.requestPageUpdate(DeviceProfile_HRM.prototype.DEFAULT_PAGE_UPDATE_DELAY);
        
    }
    
    DeviceProfile_HRM.prototype = Object.create(DeviceProfile.prototype); 
    DeviceProfile_HRM.prototype.constructor = DeviceProfile_HRM; 

    DeviceProfile_HRM.prototype.DEFAULT_PAGE_UPDATE_DELAY = 1000;
    
    // Ca. 4 messages pr. second, or 1 msg. pr 246.3 ms -> max HR supported 246.3 pr/minute
    DeviceProfile_HRM.prototype.CHANNEL_PERIOD_DEFAULT = 8070;
    DeviceProfile_HRM.prototype.CHANNEL_PERIOD_ARRAY = [
        DeviceProfile_HRM.prototype.CHANNEL_PERIOD_DEFAULT, 
        DeviceProfile_HRM.prototype.CHANNEL_PERIOD_DEFAULT*2,
        DeviceProfile_HRM.prototype.CHANNEL_PERIOD_DEFAULT*4
    ];
    
    DeviceProfile_HRM.prototype.STATE = {
        HR_EVENT: true,
        NO_HR_EVENT: false,// Sets computed heart rate to invalid = 0x00, after a timeout of 5 seconds

    };
    DeviceProfile_HRM.prototype.NAME = 'HRM';
    
    DeviceProfile_HRM.prototype.CHANNEL_ID = {
        DEVICE_TYPE: 0x78,
        TRANSMISSION_TYPE : 0x01
    }
    

//    DeviceProfile_HRM.prototype.channelResponse = function (channelResponse) {
//            this.log.log('log', 'DeviceProfile HRM', channelResponse, channelResponse.toString());
//    };
    
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
    
    // HRM sends out pages in page 4 * 64, background page 1 (for 1 second), page 4 *64, background page 2 (1 s.), page 4*64, background page 3 (1 s),....
    // When no HR data is sent from HR sensor, only background pages are sent each channel period; b1*64,b2*64,b3*64,b1*64,..... in accordance with the
    // normal behaviour of a broadcast master -> just repeat last broadcast if no new data available, then go to sleep if no HR data received in {timeout} millisec.
    // It seems like the {timeout} of HRM sensor "GARMIN HRM2-SS" is 2 minutes.
    
    DeviceProfile_HRM.prototype.BIT_MASK = {
        PAGE_TOGGLE : parseInt("01111111",2)
    };
    
    DeviceProfile_HRM.prototype.INVALID_HEART_RATE = 0x00;
    
    
    
    DeviceProfile_HRM.prototype.broadCast = function (broadcast) {
        //console.timeEnd('usbtoprofile'); // Typical 1 ms - max. 3 ms, min 0 ms. 
        //console.time('broadcast'); // Min. 1 ms - max 7 ms // Much, much faster than the channel period
        var 
//        data = broadcast.data,
//            dataView = new DataView(broadcast.data.buffer),
            page, 
            pageNumber = broadcast.data[0] & DeviceProfile_HRM.prototype.BIT_MASK.PAGE_TOGGLE,
             sensorId = broadcast.channelId.sensorId;
        
       // var TIMEOUT_CLEAR_COMPUTED_HEARTRATE = 5000,
            
        this.verifyDeviceType(DeviceProfile_HRM.prototype.CHANNEL_ID.DEVICE_TYPE,broadcast);
        
        this.countBroadcast(sensorId);
       
        if (this.isDuplicateMessage(broadcast))
            return;
    
        switch (pageNumber) {
             
            // MAIN
            case 4 : 
                 page = new HRMPage4({log: this.log.logging},broadcast,this.previousPage);
                
                break;
                
            case 0 : // OLD
                page = new HRMPage0({log: this.log.logging},broadcast,this.previousPage);
                 break;
                
            // BACKGROUND
            case 3 : 
                page = new HRMPage3({log: this.log.logging},broadcast);
                break;
                
            case 2 : 
                page = new HRMPage2({log: this.log.logging},broadcast);
                break;
                
            case 1 : 
                page = new HRMPage1({log: this.log.logging},broadcast);
                break;
            
            default : 
                this.log.log('warn','Not able to parse page number',pageNumber);
                break;
        }
        
        //  Set computedHeartRate to invalid (0x00) if heart beat counter stays the same
    
        if ((this.previousPage === undefined) || (page.heartBeatCount !== this.previousPage.heartBeatCount))
        {
            this.lastHREventTime = Date.now();
            this.state.heartRateEvent = DeviceProfile_HRM.prototype.STATE.HR_EVENT;
         
            if (page) {
               this.log.log('log', 'B# '+this.receivedBroadcastCounter[sensorId],page,page.toString());
            
               // page.timestamp = this.lastHREventTime;
                this.addPage(page);
            }
            
        }
                   
        
//        else  if  (this.lastHREventTime && (Date.now() > this.lastHREventTime+TIMEOUT_CLEAR_COMPUTED_HEARTRATE))
//                {
//                    this.log.log('warn','No heart rate event registered in the last ',TIMEOUT_CLEAR_COMPUTED_HEARTRATE+ 'ms.');
//                    this.state.heartRateEvent = DeviceProfile_HRM.prototype.STATE.NO_HR_EVENT;
//                    page.computedHeartRate = INVALID_HEART_RATE; 
//                    this.lastHREventTime = Date.now();
//                }
//        
//        
 
//        // Used for skipping duplicate messages
//        this.previousBroadcastData = data;
//        
        // Keep track of previous page state for main page 4 and 0 - calculation of RR
        if (page instanceof HRMPage4 || page instanceof HRMPage0)
            this.previousPage = page;
        
        //console.timeEnd('broadcast');
    };
    
    module.exports = DeviceProfile_HRM;
        
    return module.exports;
});