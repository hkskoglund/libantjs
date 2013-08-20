var ANT = require('ant-lib'),
    Channel = require('../channel.js');
// Based on https://developer.mozilla.org/en-US/docs/JavaScript/Introduction_to_Object-Oriented_JavaScript
function DeviceProfile(configuration) {
    this._configuration = configuration;
}

DeviceProfile.prototype = {

    DEVICE_TYPE: 0x00,

    parseBurstData: function (channelNr, data) {
        console.log("Parse burst data", data);
    },

    channelResponseEvent: function (data) {
        console.log("Channel response/event : ", data);
        //return "Not defined";
    },

    getSlaveChannelConfiguration: function () {
        return "Not defined";
    },

    getMasterChannelConfiguration: function () {
        return "Not defined";
    },

    broadCastDataParser: function (data) {
        console.log(Date.now() + "Broadcast RX : ", data);
    },

    channelResponseEvent: function (data) {
        console.log(Date.now() + "Response/Event RX : ", data);
    },

    stop: function () {

        clearInterval(this.NOOPFuncIntervalID);

        console.log("Device profile closed");
    },

    start: function (callback) {
        //console.trace();
        //console.log("THIS", this);

        var self = this,
            NOOPFunc = function () { }; // "Lazy hazy crazy days of summer" - C.Tobias, H. Carste

        self.NOOPFuncIntervalID = setInterval(NOOPFunc, 60000 * 60 * 24); // 1 "beat" each day 

        // Handle gracefull termination
        // http://thomashunter.name/blog/gracefully-kill-node-js-app-from-ctrl-c/

        process.on('SIGINT', function sigint() {
            console.log(Date.now() + " Process interrupted - signal SIGINT (Ctrl+C)");

            // TO DO:  self.sendDisconnect(); // Disconnect

            self.stop();

        });

        if (typeof callback === "function")
            callback();
        else
            console.log(Date.now(), "No callback specified after start");
    },

    enableChannelConfiguration: function (channel) {
        var self = this;
        //console.log("ENABLING CHANNEL", channel);

        var openChannel = function () {
            self.ANT.libConfig(ANT.prototype.LIB_CONFIG.ENABLE_RX_TIMESTAMP | ANT.prototype.LIB_CONFIG.ENABLE_RSSI | ANT.prototype.LIB_CONFIG.ENABLE_CHANNEL_ID,
               function _errorCB(err) { console.log(Date.now() + " Could not configure ANT for extended info. RX Timestamp/RSSI/ChannelID", err); },
                function _successCB() {

                    var listenFunc = function () {
                        //    console.log(Date.now() + " Background scanning channel ANT+ OPEN");
                        self.ANT.listen(function transferCancelCB() {
                            self.ANT.iterateChannelStatus(0, true, function _clean() {
                                self.ANT.tryCleaningBuffers(function _releaseInterfaceCloseDevice() {
                                    self.ANT.releaseInterfaceCloseDevice();
                                });
                            });
                        });
                    };

                    //console.trace();

                    //if (self._configuration.scanningChannel === ANT.prototype.SCANNING_CHANNEL_TYPE.CONTINOUS)
                    //    self.ANT.openRxScanMode(0, function (err) { console.log("Could not open Rx Scan Mode channel", err); }, listenFunc);
                    //else
                    self.ANT.open(channel.number, function (err) { console.log("Could not open channel", err); }, listenFunc);

                });
        };

        //this.ANT.setChannelConfiguration(channel);

        //this.ANT.activateChannelConfiguration(channel, function _errorCB(err) { console.log("Could not configure channel", err); },
        //                                                       function _successCB() {
        //                                                           openChannel();
        //                                                       });
    },

    getConfiguration : function () {
        return this._configuration;
    },

    initANT: function (nextCB) {
        var self = this;

        if (typeof this._configuration === "undefined") {
            console.warn(Date.now(), "No configuration found - cannot initialize USB ANT without vendor and product id.");
            return;
        }

        if (typeof this._configuration.usb === "undefined") {
            console.warn(Date.now(), "No USB configuration was found on configuration ", this._configuration);
            return;
        }

        if (typeof this._configuration.usb.idVendor === "undefined") {
            console.warn(Date.now(), "No vendor ID was found on usb configuration ", this._configuration.usb);
            return;
        }

        if (typeof this._configuration.usb.idProduct === "undefined") {
            console.warn(Date.now(), "No product ID was found on usb configuration ", this._configuration.usb);
            return;
        }

        this.ANT = new ANT();

        this.ANT.init(this._configuration.usb.idVendor, this._configuration.usb.idProduct, function _ANTinitCB(error) {

            if (!error)
                self.start.bind(self, nextCB)
            else
                nextCB(error);
        });
    },
};

module.exports = DeviceProfile;
