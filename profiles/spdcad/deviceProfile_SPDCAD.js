
define(function (require, exports, module) {
    'use strict';

    var DeviceProfile = require('profiles/deviceProfile'),
         setting = require('settings'),
        HighPrioritySearchTimeout = require('messages/HighprioritySearchTimeout'),
        LowPrioritySearchTimeout = require('messages/LowprioritySearchTimeout'),
        SPDCADPage0 = require('profiles/spdcad/SPDCADPage0');


    function DeviceProfile_SPDCAD(configuration) {

        DeviceProfile.call(this, configuration);

        this.addConfiguration("slave", {
            description: "Slave configuration for ANT+ SPDCAD device profile",
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: DeviceProfile_SPDCAD.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            LPsearchTimeout: new LowPrioritySearchTimeout(LowPrioritySearchTimeout.prototype.MAX),
            HPsearchTimeout: new HighPrioritySearchTimeout(HighPrioritySearchTimeout.prototype.DISABLED),

            channelPeriod: DeviceProfile_SPDCAD.prototype.CHANNEL_PERIOD.DEFAULT

        });

        this.addConfiguration("master", {
            description: "Master configuration for ANT+ SDM device profile",
            networkKey: setting.networkKey["ANT+"],

            channelType: "master",
            channelId: { deviceNumber: 'serial number', deviceType: DeviceProfile_SPDCAD.prototype.CHANNEL_ID.DEVICE_TYPE, transmissionType: DeviceProfile_SPDCAD.prototype.CHANNEL_ID.TRANSMISSION_TYPE },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +

            channelPeriod: DeviceProfile_SPDCAD.prototype.CHANNEL_PERIOD.DEFAULT

        });

        // Used for calculation of cadence and speed
        // Using an object literal allows for tracking multiple sensors by indexing with sensorId (based on channelId)
        this.previousPage = {};

        this.requestPageUpdate(DeviceProfile_SPDCAD.prototype.DEFAULT_PAGE_UPDATE_DELAY);
    }

    //Inherit
    // Need a new inherited object prototype, otherwise changes to the inherited prototype will propagate along the prototype chain to the parent prototype
    // So DeviceProfile_SPDCAD.prototype = DeviceProfile.prototype is not the right way to do proper inheritance
    DeviceProfile_SPDCAD.prototype = Object.create(DeviceProfile.prototype);
    DeviceProfile_SPDCAD.constructor = DeviceProfile_SPDCAD;

    DeviceProfile_SPDCAD.prototype.DEFAULT_PAGE_UPDATE_DELAY = 1000;

    DeviceProfile_SPDCAD.prototype.NAME = 'SPDCAD';

    DeviceProfile_SPDCAD.prototype.CHANNEL_ID = {
        DEVICE_TYPE: 0x79, // 121
        TRANSMISSION_TYPE: 1
    };

    DeviceProfile_SPDCAD.prototype.CHANNEL_PERIOD = {
        DEFAULT: 8086, // Ca. 4 messages pr. sec.
        ALTERNATIVE_1: 16172, // 2 msg/sec
        ALTERNATIVE_2: 32344 // 1 msg/sec
    }


    DeviceProfile_SPDCAD.prototype.WHEEL_CIRCUMFERENCE = 2.07; // in meter -> should be able to configure in a setting

    // SPDCAD one of the old device profiles without common pages conforming to the ANT+ message format
    DeviceProfile_SPDCAD.prototype.hasCommonPages = false;

    DeviceProfile_SPDCAD.prototype.broadCast = function (broadcast) {

        var page,
            // Spec p. 34  "The combined bike speed and cadence data format was one of the first defined ANT+ message format and 
            // does not conform to the standard ANT+ message definition"
            pageNumber = 0, // No page number in message format
            sensorId = broadcast.channelId.sensorId,
            pageIdentifier = sensorId + '.' + pageNumber;

        broadcast.profile = this;
            
        // Don't process broadcast with wrong device type
        if (!this.verifyDeviceType(DeviceProfile_SPDCAD.prototype.CHANNEL_ID.DEVICE_TYPE, broadcast))
            return;

        this.countBroadcast(sensorId);

        // Don't process duplicate broadcast
        if (this.isDuplicateMessage(broadcast)) {


            return;

        }

        page = new SPDCADPage0({ log: this.log.logging }, broadcast, this.previousPage[sensorId]);
       
        page.parse(broadcast);
        

        if (this.log.logging) this.log.log('info', sensorId + ' B#' + this.receivedBroadcastCounter[sensorId], page, page.toString());

        this.addPage(page);

            //if (this.receivedBroadcastCounter[sensorId] >= BROADCAST_LIMIT_BEFORE_UI_UPDATE)
            //    this.onPage(page);
            //else if (this.log.logging)
            //    this.log.log('warn', 'Skipping page, broadcast for SPDCAD sensor ' + sensorId + ' is ' + this.receivedBroadcastCounter[sensorId] + ' which is  threshold for UI update ' + BROADCAST_LIMIT_BEFORE_UI_UPDATE);

        

        this.previousPage[sensorId] = page;

       
        //// Add header
        //page.dataPageNumber = dataPageNumber, // Combined cadence/speed only has page 0 
        //page.timestamp = receivedTimestamp,
        ////deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE,  // Should make it possible to classify which sensors data comes from
        //page.channelID = this.channelID,  // Channel ID is already contained in data, but its already parsed in the ANT library (parse_response func.)

        //page.toString = function () {
        //    var msg = "Cadence event time " + this.bikeCadenceEventTime / 1024 + " s" +
        //        " Count " + this.cumulativeCadenceRevolutionCount +
        //        " Speed event time " + this.bikeSpeedEventTime / 1024 + " s" +
        //        " Count " + this.cumulativeSpeedRevolutionCount;

        //    if (this.cadence)
        //        msg += " Cadence " + this.cadence.toFixed(0) + " RPM";

        //    if (this.speed)
        //        msg += " Speed " + this.speed.toFixed(2) + " m/s";

        //    if (this.distance)
        //        msg += " Distance " + this.distance + " m";

        //    return msg;
        //}

        //if (typeof this.channelID === "undefined")
        //    console.log(Date.now(), "No channel ID found for this master, every master has a channel ID, verify that channel ID is set (should be set during parse_response in ANT lib.)");

        //if (typeof this.channelIDCache[this.channelID.toProperty] === "undefined") {
        //    //console.log(Date.now(), "Creating object in channelIDCache to store previous page for master with channel Id", this.channelID);
        //    this.channelIDCache[this.channelID.toProperty] = {};
        //}

        //// Initialize previous page for cadence/speed
        //if (typeof this.channelIDCache[this.channelID.toProperty].previousCadencePage === "undefined")
        //    this.channelIDCache[this.channelID.toProperty].previousCadencePage = page;

        //if (typeof this.channelIDCache[this.channelID.toProperty].previousSpeedPage === "undefined")
        //    this.channelIDCache[this.channelID.toProperty].previousSpeedPage = page;

        //prevPage = this.channelIDCache[this.channelID.toProperty].previousCadencePage;

        //if (prevPage && prevPage.cumulativeCadenceRevolutionCount !== page.cumulativeCadenceRevolutionCount) {  // Filter out identical messages, i.e crank revolving slowly

        //    // ANT+ Managed Network Document - Bike Speed and Cadence Device Profile , p. 29
        //    timestampDifference = page.timestamp - prevPage.timestamp,

        //    numberOfEventTimeRollovers = Math.floor(timestampDifference / 64000);  // 64 seconds pr. rollover
        //    //console.log("Timestamp difference between change in cadence revolution is ", timestampDifference, "ms", "Event time rollovers", numberOfEventTimeRollovers);

        //    if (numberOfEventTimeRollovers >= 1)
        //        console.log(Date.now(), "There are", numberOfEventTimeRollovers, " rollovers (lasting 64 s.) for bike cadence/speed event time. Choosing to skip this gap in the data.");
        //    else {
        //        var rollOverCadenceTime = (prevPage.bikeCadenceEventTime > page.bikeCadenceEventTime) ? true : false,
        //            rollOverCadenceRevolution = (prevPage.cumulativeCadenceRevolutionCount > page.cumulativeCadenceRevolutionCount) ? true : false,
        //            revolutionCountDifference,
        //            measurementTimeDifference;

        //        if (rollOverCadenceRevolution)
        //            page.revolutionCadenceCountDifference = (0xFFFF - prevPage.cumulativeCadenceRevolutionCount) + page.cumulativeCadenceRevolutionCount;
        //        else
        //            page.revolutionCadenceCountDifference = page.cumulativeCadenceRevolutionCount - prevPage.cumulativeCadenceRevolutionCount;

        //        // Check for number of rollovers in 64 seconds by using timestamp 

        //        if (rollOverCadenceTime)
        //            page.measurementCadenceTimeDifference = (0xFFFF - prevPage.bikeCadenceEventTime) + page.bikeCadenceEventTime;
        //        else
        //            page.measurementCadenceTimeDifference = page.bikeCadenceEventTime - prevPage.bikeCadenceEventTime;

        //        page.cadence = 60 * page.revolutionCadenceCountDifference * 1024 / page.measurementCadenceTimeDifference; // RPM

        //    }

        //    this.channelIDCache[this.channelID.toProperty].previousCadencePage = page;
        //}

        //prevPage = this.channelIDCache[this.channelID.toProperty].previousSpeedPage;

        //if (prevPage && prevPage.cumulativeSpeedRevolutionCount !== page.cumulativeSpeedRevolutionCount) {  // Filter out identical messages, i.e wheel revolving slowly

        //    // ANT+ Managed Network Document - Bike Speed and Cadence Device Profile , p. 29

        //    timestampDifference = page.timestamp - prevPage.timestamp,

        //   numberOfEventTimeRollovers = Math.floor(timestampDifference / 64000);  // 64 seconds pr. rollover for bike speed/cadence event time
        //    //console.log("Timestamp difference between change in cadence revolution is ", timestampDifference, "ms", "Event time rollovers", numberOfEventTimeRollovers);

        //    if (numberOfEventTimeRollovers >= 1)
        //        console.log(Date.now(), "There are", numberOfEventTimeRollovers, " rollovers (lasting 64 s.) for bike cadence/speed event time. Choosing to skip this gap in the data.");
        //    else {
        //        var rollOverSpeedTime = (prevPage.bikeSpeedEventTime > page.bikeSpeedEventTime) ? true : false,
        //            rollOverSpeedRevolution = (prevPage.cumulativeSpeedRevolutionCount > page.cumulativeSpeedRevolutionCount) ? true : false,
        //            revolutionSpeedCountDifference,
        //            measurementSpeedTimeDifference;

        //        if (rollOverSpeedTime)
        //            page.measurementSpeedTimeDifference = (0xFFFF - prevPage.bikeSpeedEventTime) + page.bikeSpeedEventTime;
        //        else
        //            page.measurementSpeedTimeDifference = page.bikeSpeedEventTime - prevPage.bikeSpeedEventTime;

        //        if (rollOverSpeedRevolution)
        //            page.revolutionSpeedCountDifference = (0xFFFF - prevPage.cumulativeSpeedRevolutionCount) + page.cumulativeSpeedRevolutionCount;
        //        else
        //            page.revolutionSpeedCountDifference = page.cumulativeSpeedRevolutionCount - prevPage.cumulativeSpeedRevolutionCount;

        //        // ANT+ Managed Network Document - Bike Speed and Cadence Device Profile , p. 20


        //        page.speed = (DeviceProfile_SPDCAD.prototype.WHEEL_CIRCUMFERENCE / 1000) * page.revolutionSpeedCountDifference * 1024 / page.measurementSpeedTimeDifference;

        //        // accumulated distance between measurements
        //        page.defaultWheelCircumference = DeviceProfile_SPDCAD.prototype.WHEEL_CIRCUMFERENCE;
        //        page.defaultAccumulatedDistance = (DeviceProfile_SPDCAD.prototype.WHEEL_CIRCUMFERENCE / 1000) * page.revolutionSpeedCountDifference;
        //    }

        //    this.channelIDCache[this.channelID.toProperty].previousSpeedPage = page;
        //}


        //if (page.cadence || page.speed) {
        //    console.log(Date.now(), page.toString());
        //    this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients
        //}



        ////console.log(Date.now(), page);

        //  }



    };

    module.exports = DeviceProfile_SPDCAD;
    return module.exports;
});