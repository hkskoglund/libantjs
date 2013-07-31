var DeviceProfile = require('./deviceProfile.js');
var Channel = require('./channel.js');
var Network = require('./network.js');
var ANT = require('ant-lib');

function DeviceProfile_SDM(nodeInstance) {
    DeviceProfile.call(this); // Call parent
    this.nodeInstance = nodeInstance;
    
}

DeviceProfile_SDM.protype = DeviceProfile.prototype;  // Inherit properties/methods

DeviceProfile_SDM.constructor = DeviceProfile_SDM;  // Update constructor

DeviceProfile_SDM.prototype = {

    NAME: 'SDM',

    DEVICE_TYPE: 0x7C,

    CHANNEL_PERIOD: 8134, // 4 hz

    ALTERNATIVE_CHANNEL_PERIOD: 16268,  // 2 Hz

    // Override/"property shadowing"
    getSlaveChannelConfiguration: function (networkNr, channelNr, deviceNr, transmissionType, searchTimeout, lowPrioritySearchTimeout) {

        this.channel = new Channel(channelNr, Channel.prototype.CHANNEL_TYPE.receive_channel, networkNr, new Buffer(this.nodeInstance.configuration.network_keys.ANT_PLUS), this.nodeInstance.STARTUP_DIRECTORY);

        this.channel.setChannelId(deviceNr, DeviceProfile_SDM.prototype.DEVICE_TYPE, transmissionType, false);

        this.channel.setChannelPeriod(DeviceProfile_SDM.prototype.CHANNEL_PERIOD); // Ca. 4 messages pr. second
        this.channel.setChannelSearchTimeout(searchTimeout);
        this.channel.setLowPrioritySearchTimeout(lowPrioritySearchTimeout);

        this.channel.setChannelFrequency(ANT.prototype.ANT_FREQUENCY);

        this.channel.broadCastDataParser = this.broadCastDataParser || DeviceProfile.prototype.broadCastDataParser; // Called on received broadcast data

        this.channel.nodeInstance = this.nodeInstance; // Attach channel to nodeInstance
        this.channel.deviceProfile = this; // Attach deviceprofile to channel

        //this.channel = channel; // Attach channel to device profile
        this.channel.channelResponseEvent = this.channelResponseEvent || DeviceProfile.prototype.channelResponseEvent;

        this.channel.addListener(Channel.prototype.EVENT.CHANNEL_RESPONSE_EVENT, this.channel.channelResponseEvent);
        this.channel.addListener(Channel.prototype.EVENT.BROADCAST, this.channel.broadCastDataParser);

        //console.log(this.channel);

        return this.channel;

    },

    channelResponseEvent : function (data,channelResponseMessage)
    {
       
    },

    broadCastDataParser: function (data) {
        //console.log("THIS IN BROADCAST DATA PARSER", this);
        // console.log(Date.now() + " SDM broadcast data ", data);
        var receivedTimestamp = Date.now(),
          self = this,
           UNUSED = 0x00,
           msg;// Will be cannel configuration


        // 0 = SYNC, 1= Msg.length, 2 = Msg. id (broadcast), 3 = channel nr , 4= start of page  ...
        var startOfPageIndex = 4;

       // console.log("CHANNELID AS PROPERTY", this.channelID.toProperty);
      
        //this.channelIDCache[this.channelID.toProperty].testing = "Hello there property value";
        //console.log(this.channelIDCache[this.channelID.toProperty].testing);

        // Issue : sometimes get 252 as deviceID ???
        // Number(252).toString(2) gives 11111100
        // Number(124).toString(2) gives 01111100
        // Seems like a bit error on the most significant bit

        if (this.channelID.deviceTypeID !== 124) {
            console.log(Date.now(),"Got broadcast data ",data,"expected device type SDM ",Number(124).toString(2)," but got ",Number(this.channelID.deviceTypeID).toString(2)," skipped")
            return;
        }

        var page = {
            // Header
            dataPageNumber: data[startOfPageIndex] & 0x7F,
            channelID : this.channelID,

            timestamp: Date.now()
        };

        var convertToMinPrKM = function (speed) {
            if (speed === 0)
                return 0;
            else
                return 1 / (speed * 60 / 1000);
        };

        var formatToMMSS = function (speed) {
            if (speed === 0)
                return "00:00";

            var minutes = Math.floor(speed);
            var seconds = parseInt(((speed - minutes) * 60).toFixed(), 10); // implicit rounding
            if (seconds === 60) {
                seconds = 0;
                minutes += 1;
            }

            var result = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

            return result;
        };

        //console.log("Channel ID:",this.channelID.toProperty);

        if (typeof this.channelID === "undefined") {
            console.log(Date.now(), "No channel ID found for this master, every master has a channel ID, verify that channel ID is set (should be set during parse_response in ANT lib.)");
            console.trace();
        }

        
        // With a channel frequency of about 4 Hz messages are received in p1,p1,p2,p2,p1,p1,p2,p2,...
        // A simple solution would be just to count messages and just send the first page each time

        switch (page.dataPageNumber) {

            case 1: // Main page


                page.pageType = "Main";

                page.timeFractional = data[startOfPageIndex + 1] * (1 / 200); // s
                page.timeInteger = data[startOfPageIndex + 2];
                page.time = page.timeInteger + page.timeFractional;

                page.distanceInteger = data[startOfPageIndex + 3]; // m
                page.distanceFractional = ((data[startOfPageIndex + 4] & 0xF0) >> 4) * (1 / 16); // Upper 4 bit
                page.distance = page.distanceInteger + page.distanceFractional;

                page.speedInteger = data[startOfPageIndex + 4] & 0x0F; // lower 4 bit
                page.speedFractional = data[startOfPageIndex + 5] * (1 / 256);   // m/s
                page.speed = page.speedInteger + page.speedFractional;

                page.strideCount = data[startOfPageIndex + 6];
                page.updateLatency = data[startOfPageIndex + 7] * (1 / 32); // s

                // Only transmit new message on socket if strideCount is updated, otherwise duplicate messages can be sent
                //if (typeof this.deviceProfile.connectedSensor[this.channelID.toProperty].previousStrideCount === "undefined" || this.deviceProfile.connectedSensor[this.channelID.toProperty].previousStrideCount != page.strideCount) {
                //if (this.deviceProfile.connectedSensor[this.channelID.toProperty]["page1"] === 1)
                  this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients
                   // this.deviceProfile.connectedSensor[this.channelID.toProperty].strideCountWasUpdated = true;
                //}
                //else this.deviceProfile.connectedSensor[this.channelID.toProperty].strideCountWasUpdated = false;

               // else console.log("SKIPPED DUPLICATE MSG on web socket");
                
                // Time starts when SDM is powered ON
                msg = page.pageType+ " "+page.dataPageNumber+ " ";
                if (page.time !== UNUSED)
                    msg += "SDM Time : " + page.time + " s";
                else
                    msg += "SDM Time : 0"+ " s";

                if (page.distance !== UNUSED)
                    msg += " Distance : " + page.distance + " m";
                else
                    msg += " Distance : 0"+" m";

                if (page.speed !== UNUSED)
                    msg += " Speed : " + page.speed.toFixed(1) + " m/s " + " - "+formatToMMSS(convertToMinPrKM(page.speed)) + " min/km";
                else
                    msg += " Speed : 0" + " m/s";

                msg += " Stride count : " + page.strideCount;

                // p. 25 section 6.2.7 Update Latecy . Stride Based Speed and Distance Monitor Device Profile
                // "represents the time from the end of the last motion event to the time at which the message was transmitted. This time includes computation time
                // as well as the delay before the message is actually transmitted, which depends on the message rate"
                if (page.updateLatency !== UNUSED)
                    msg += " Update latency : " + page.updateLatency + " s";
                else
                    msg += " Update latency : 0"+" s";

                console.log(Date.now() + " " + msg);

                break;

            case 2: // Base template 

                page.pageType = "Background";

                page.cadenceInteger = data[startOfPageIndex + 3] 
                page.cadenceFractional = ((data[startOfPageIndex + 4] & 0xF0) >> 4) * (1 / 16);
                page.cadence = page.cadenceInteger + page.cadenceFractional;

                page.speedInteger = data[startOfPageIndex + 4] & 0x0F; // lower 4 bit
                page.speedFractional = data[startOfPageIndex + 5] * (1 / 256);   // m/s
                page.speed = page.speedInteger + page.speedFractional;

                page.status = {
                    SDMLocation: (data[startOfPageIndex + 7] & 0xC0) >> 6,
                    BatteryStatus: (data[startOfPageIndex + 7] & 0x30) >> 4,
                    SDMHealth: (data[startOfPageIndex + 7] & 0x0C) >> 2,
                    UseState: (data[startOfPageIndex + 7] & 0x03)
                };

                switch (page.status.SDMLocation) {
                    case 0x00: page.status.SDMLocationFriendly = "Laces"; break;
                    case 0x01: page.status.SDMLocationFriendly = "Midsole"; break;
                    case 0x02: page.status.SDMLocationFriendly = "Other"; break;
                    case 0x03: page.status.SDMLocationFriendly = "Ankle"; break;
                    default: page.status.SDMLocationFriendly = "? " + page.status.SDMLocation; break;
                }

                switch (page.status.BatteryStatus) {
                    case 0x00: page.status.BatteryStatusFriendly = "OK (new)"; break;
                    case 0x01: page.status.BatteryStatusFriendly = "OK (good)"; break;
                    case 0x02: page.status.BatteryStatusFriendly = "OK"; break;
                    case 0x03: page.status.BatteryStatusFriendly = "Low battery"; break;
                    default: page.status.BatteryStatusFriendly = "? " + page.status.BatteryStatus; break;
                }

                switch (page.status.SDMHealth) {
                    case 0x00: page.status.SDMHealthFriendly = "OK"; break;
                    case 0x01: page.status.SDMHealthFriendly = "Error"; break;
                    case 0x02: page.status.SDMHealthFriendly = "Warning"; break;
                    case 0x03: page.status.SDMHealthFriendly = "Reserved"; break;
                    default: page.status.SDMHealthFriendly = "? " + page.status.SDMHealth; break;
                }

                switch (page.status.UseState) {
                    case 0x00: page.status.UseStateFriendly = "IN-ACTIVE"; break;
                    case 0x01: page.status.UseStateFriendly = "ACTIVE"; break;
                    case 0x02: page.status.UseStateFriendly = "Reserved"; break;
                    case 0x03: page.status.UseStateFriendly = "Reserved"; break;
                    default: page.status.UseStateFriendly = "? " + page.status.UseState; break;
                }

                // Only send data on websocket when SDM is active
                //if (page.status.UseState === 0x01)

                //if (this.deviceProfile.connectedSensor[this.channelID.toProperty]["page2"] === 1)
                  this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients


                msg =  page.pageType + " " + page.dataPageNumber + " ";

                if (page.cadence !== UNUSED)
                    msg += "Cadence : " + page.cadence.toFixed(1) + " strides/min ";
                else
                    msg += "Cadence : 0";

                if (page.speed !== UNUSED)
                    msg += " Speed : " + page.speed.toFixed(1);
                else
                    msg += " Speed : 0";


                msg += " Location: " + page.status.SDMLocationFriendly + " Battery: " + page.status.BatteryStatusFriendly + " Health: " + page.status.SDMHealthFriendly + " State: " + page.status.UseStateFriendly;

                console.log(Date.now() + " " + msg);

                break;


            case 0x50: // 80 Common data page - Manufactorer's identification - REQUIRED - sent every 65 messages


                page.pageType = "Background";
                page.HWRevision = data[startOfPageIndex + 3];
                page.manufacturerID = data.readUInt16LE(4);
                page.modelNumber = data.readUInt16LE(6);

                // Seems like only 1 page is sent each time
               // if (this.deviceProfile.connectedSensor[this.channelID.toProperty]["page0x50"] === 1)
                 this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients

                console.log(Date.now() + " " + page.pageType + " " + page.dataPageNumber + " HW revision: " + page.HWRevision + " Manufacturer ID: " + page.manufacturerID + " Model : " + page.modelNumber);

                break;

            case 0x51: // 81 Common data page - Product information - REQUIRED - sent every 65 messages

                page.pageType = "Background";
                page.SWRevision = data[startOfPageIndex + 3];
                page.serialNumber = data.readUInt32LE(4);

                //if (this.deviceProfile.connectedSensor[this.channelID.toProperty]["page0x51"] === 1)
                  this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients

                if (page.serialNumber === 0xFFFFFFFF)
                    console.log(Date.now() + " "  +page.pageType + " " + page.dataPageNumber + " SW revision : " + page.SWRevision + " No serial number");
                else
                    console.log(Date.now() + " " + page.pageType + " " + page.dataPageNumber + " SW revision : " + page.SWRevision + " Serial number: " + page.serialNumber);

                break;

            case 0x52: // 82 Common data page - Battery Status
                //console.log("Battery status : ",data);
                page.pageType = "Background";
                page.descriptive = {
                    coarseVoltage: data[startOfPageIndex + 7] & 0x0F,        // Bit 0-3
                    batteryStatus: (data[startOfPageIndex + 7] & 0x70) >> 4, // Bit 4-6
                    resoultion: (data[startOfPageIndex + 7] & 0x80) >> 7 // Bit 7 0 = 16 s, 1 = 2 s
                };

                var divisor = (page.resolution === 1) ? 2 : 16;


                page.cumulativeOperatingTime = (data.readUInt32LE(startOfPageIndex + 3) & 0x00FFFFFF) / divisor; // 24 - bit only
                page.fractionalBatteryVoltage = data[startOfPageIndex + 6] / 256; // Volt
                if (page.descriptive.coarseVoltage === 0x0F)
                    page.batteryVoltage = "Invalid";
                else
                    page.batteryVoltage = page.fractionalBatteryVoltage + page.descriptive.coarseVoltage;

                //if (this.deviceProfile.connectedSensor[this.channelID.toProperty]["page0x52"] === 1)
                  this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients

                msg = "";

                switch (page.descriptive.batteryStatus) {
                    case 0x00: msg += "Reserved"; break;
                    case 0x01: msg += "New"; break;
                    case 0x02: msg += "Good"; break;
                    case 0x03: msg += "OK"; break;
                    case 0x04: msg += "Low"; break;
                    case 0x05: msg += "Critical"; break;
                    case 0x06: msg += "Reserved"; break;
                    case 0x07: msg += "Invalid"; break;
                    default: msg += "? - " + page.descriptive.batteryStatus;
                }

                //console.log(page);

                var batteryVoltageToString = function (voltage) {
                    if (typeof voltage === "number")
                        return voltage.toFixed(1);
                    else
                        return ""+voltage;
                }

                console.log(Date.now()+" "+ page.pageType + " " + page.dataPageNumber + " Cumulative operating time (s): " + page.cumulativeOperatingTime + " Battery (V) " + batteryVoltageToString(page.batteryVoltage) + " Battery status: " + msg);
                break;

            default:

                console.log("Page ", page.dataPageNumber, " parsing not implemented.");
                break;
        }
    }
};

module.exports = DeviceProfile_SDM;