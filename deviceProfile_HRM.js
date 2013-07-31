var DeviceProfile = require('./deviceProfile.js');
var Channel = require('./channel.js');
var Network = require('./network.js');
var ANT = require('ant-lib');

function DeviceProfile_HRM(nodeInstance) {
    DeviceProfile.call(this, nodeInstance); // Call parent
    this.nodeInstance = nodeInstance;

}

DeviceProfile_HRM.prototype = DeviceProfile.prototype;  // Inherit properties/methods

DeviceProfile_HRM.constructor = DeviceProfile_HRM;  // Update constructor

DeviceProfile_HRM.prototype = {

    NAME : 'HRM',

    DEVICE_TYPE: 0x78,

    CHANNEL_PERIOD: 8070,

    // Override/"property shadowing"
    //                                   Network.prototype.ANT,      0, 0, 0, Math.round(15/2.5)
    getSlaveChannelConfiguration: function (networkNr, channelNr, deviceNr, transmissionType, searchTimeout) {
        // ANT+ Managed Network Document – Heart Rate Monitor Device Profile  , p . 9  - 4 channel configuration

        var channel = new Channel(channelNr, Channel.prototype.CHANNEL_TYPE.receive_channel, networkNr, new Buffer(this.nodeInstance.configuration.network_keys.ANT_PLUS), this.nodeInstance.STARTUP_DIRECTORY);

        channel.setChannelId(deviceNr, DeviceProfile_HRM.prototype.DEVICE_TYPE, transmissionType, false);

        channel.setChannelPeriod(DeviceProfile_HRM.prototype.CHANNEL_PERIOD); // Ca. 4 messages pr. second, or 1 msg. pr 246.3 ms -> max HR supported 246.3 pr/minute 
        channel.setChannelSearchTimeout(searchTimeout);
        channel.setChannelFrequency(ANT.prototype.ANT_FREQUENCY);

        channel.broadCastDataParser = this.broadCastDataParser || DeviceProfile.prototype.broadCastDataParser; // Called on received broadcast data

        channel.nodeInstance = this.nodeInstance; // Attach channel to nodeInstance
        channel.deviceProfile = this; // Attach deviceprofile to channel

        this.channel = channel; // Attach channel to device profile
        this.channel.channelResponseEvent = this.channelResponseEvent || DeviceProfile.prototype.channelResponseEvent;

        this.channel.addListener(Channel.prototype.EVENT.CHANNEL_RESPONSE_EVENT, this.channel.channelResponseEvent);
        this.channel.addListener(Channel.prototype.EVENT.BROADCAST, this.channel.broadCastDataParser);

        

        return channel;
    },

    channelResponseEvent : function (data)
    {
        var self = this, antInstance = this.nodeInstance.ANT, reOpeningTimeout = 5000;

        if (antInstance.isEvent(ANT.prototype.RESPONSE_EVENT_CODES.EVENT_RX_SEARCH_TIMEOUT, data)) {
            console.log(Date.now() + " Channel " + self.number + " search timed out.");
            //setTimeout(function handler() {
            //    antInstance.open(self.number, function errorCB(error) { console.log(Date.now() + " Failed to reopen channel " + self.number, error); },
            //        function successCB() { });
            //}, reOpeningTimeout);
        }

        else if (antInstance.isEvent(ANT.prototype.RESPONSE_EVENT_CODES.EVENT_CHANNEL_CLOSED, data)) {
           // console.log(Date.now() + " Channel " + self.number + " is closed.");
           
            //if (antInstance.inTransfer) {
            //    console.log("Cancelling transfer");
            //    antInstance.inTransfer.cancel(); // Cancel listener on inendpoint
            //}
            //setTimeout(function handler() {
            //    antInstance.open(self.number, function errorCB(error) { console.log(Date.now() + " Failed to reopen channel " + self.number, error); },
            //        function successCB() { });
            //}, reOpeningTimeout);
        }
    },

    broadCastDataParser: function (data) {
        var receivedTimestamp = Date.now(),
            self = this;// Will be cannel configuration

        // 0 = SYNC, 1= Msg.length, 2 = Msg. id (broadcast), 3 = channel nr , 4= start of page  ...
        var startOfPageIndex = 4;
        // console.log(Date.now() + " HRM broadcast data ", data);
        var pageChangeToggle = data[startOfPageIndex] & 0x80,
             dataPageNumber = data[startOfPageIndex] & 0x7F;

        //heart
        var page = {
            // Header

            timestamp: receivedTimestamp,
            //deviceType: DeviceProfile_HRM.prototype.DEVICE_TYPE,  // Should make it possible to classify which sensors data comes from
            channelID : this.channelID,  // Channel ID is already contained in data, but its already parsed in the ANT library (parse_response func.)

            pageChangeToggle: pageChangeToggle,
            dataPageNumber: dataPageNumber,

            heartBeatEventTime: data.readUInt16LE(startOfPageIndex + 4),
            heartBeatCount: data[startOfPageIndex + 6],
            computedHeartRate: data[startOfPageIndex + 7],

        };

        if (typeof this.channelID === "undefined")
            console.log(Date.now(), "No channel ID found for this master, every master has a channel ID, verify that channel ID is set (should be set during parse_response in ANT lib.)");

        if (typeof this.channelIDCache[this.channelID.toProperty] === "undefined") {
            console.log(Date.now(), "Creating object in channelIDCache to store i.e previousHeartBeatEventTime for master with channel Id", this.channelID);
            this.channelIDCache[this.channelID.toProperty] = {};
        }

        switch (dataPageNumber) {

            case 4: // Main data page

                page.pageType = "Main";
                page.previousHeartBeatEventTime = data.readUInt16LE(startOfPageIndex + 2);

                var rollOver = (page.previousHeartBeatEventTime > page.heartBeatEventTime) ? true : false;

                if (rollOver)
                    page.RRInterval = (0xFFFF - page.previousHeartBeatEventTime) + page.heartBeatEventTime;
                else
                    page.RRInterval = page.heartBeatEventTime - page.previousHeartBeatEventTime;

                // Must index channel = this by channelID to handle multiple masters
                if (this.channelIDCache[this.channelID.toProperty].previousHeartBeatEventTime !== page.heartBeatEventTime) {  // Filter out identical messages
                    this.channelIDCache[this.channelID.toProperty].previousHeartBeatEventTime = page.heartBeatEventTime;
                    var msg = page.pageType + " " + page.dataPageNumber + " HR " + page.computedHeartRate + " heart beat count " + page.heartBeatCount + " RR " + page.RRInterval;
                    console.log(msg);
                    this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients


                    if (this.channelIDCache[this.channelID.toProperty].timeout) {
                        clearTimeout(this.channelIDCache[this.channelID.toProperty].timeout);
                        //console.log("After clearing", this.timeout);
                        delete this.channelIDCache[this.channelID.toProperty].timeout;
                    }

                    this.channelIDCache[this.channelID.toProperty].timeout = setTimeout(function () { console.log(Date.now() + " Lost broadcast data from HRM"); }, 3000);
                }
                break;

            case 2: // Background data page - sent every 65'th message
                page.pageType = "Background";
                page.manufacturerID = data[startOfPageIndex + 1];
                page.serialNumber = data.readUInt16LE(startOfPageIndex + 2);

                if (this.channelIDCache[this.channelID.toProperty].previousHeartBeatEventTime !== page.heartBeatEventTime) {
                    this.channelIDCache[this.channelID.toProperty].previousHeartBeatEventTime = page.heartBeatEventTime;
                    console.log(page.pageType + " " + page.dataPageNumber + " Manufacturer " + page.manufacturerID + " serial number : " + page.serialNumber);
                    this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients
                }

                break;

            case 3: // Background data page
                page.pageType = "Background";
                page.hardwareVersion = data[startOfPageIndex + 1];
                page.softwareVersion = data[startOfPageIndex + 2];
                page.modelNumber = data[startOfPageIndex + 3];

                if (this.channelIDCache[this.channelID.toProperty].previousHeartBeatEventTime !== page.heartBeatEventTime) {
                    this.channelIDCache[this.channelID.toProperty].previousHeartBeatEventTime = page.heartBeatEventTime;
                    console.log(page.pageType + " " + page.dataPageNumber + " HW version " + page.hardwareVersion + " SW version " + page.softwareVersion + " Model " + page.modelNumber);
                    this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients
                }

                break;

            case 1: // Background data page
                page.pageType = "Background";
                page.cumulativeOperatingTime = (data.readUInt32LE(startOfPageIndex + 1) & 0x00FFFFFF) / 2; // Seconds since reset/battery replacement
                if (this.channelIDCache[this.channelID.toProperty].previousHeartBeatEventTime !== page.heartBeatEventTime) {
                    this.channelIDCache[this.channelID.toProperty].previousHeartBeatEventTime = page.heartBeatEventTime;
                    console.log(page.pageType+" "+page.dataPageNumber+ " Cumulative operating time (s) " + page.cumulativeOperatingTime + " hours: " + page.cumulativeOperatingTime / 3600);
                    this.nodeInstance.broadCastOnWebSocket(JSON.stringify(page)); // Send to all connected clients
                }

                break;

            case 0: // Background - unknown data format
                page.pageType = "Background";
                break;

            default:

                console.log("Page ", dataPageNumber, " not implemented.");
                break;
        }

        
    }
};

module.exports = DeviceProfile_HRM;

