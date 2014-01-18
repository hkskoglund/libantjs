/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";

    var Channel = require('channel');


    function DeviceProfile(configuration) {
        Channel.call(this, configuration);
        //this._configuration = configuration;

        if (configuration.onPage)
            this.setOnPage(configuration.onPage);

        this.receivedBroadcastCounter = {};

        this.previousPageBroadcast = {}; // Just declare property


    }

    
    DeviceProfile.prototype = Object.create(Channel.prototype);

    DeviceProfile.prototype.constructor = DeviceProfile;

    // FILTER - Skip duplicate messages from same master 
    DeviceProfile.prototype.isDuplicateMessage = function (broadcast) {

        var data = broadcast.data,

            isHRM = broadcast.channelId.deviceType === 120 ? true : false,

           pageIdentifier = broadcast.channelId.sensorId + '.',

           previousBroadcastData,

            // Compare buffers byte by byte
            isEqual = function (buf1, buf2) {
                // Could have used bitmask from outer function via closure mechanism, but chose to pass is as a argument (could be moved without requiring context)

                var byteNr,
                    applyBitmask;


                if (!isHRM)
                    applyBitmask = 0xFF;
                else
                    applyBitmask = 0x7F;

                if (buf1.length !== buf2.length)
                    return false;

                for (byteNr = 0; byteNr < buf1.length; byteNr++) {

                    if (byteNr === 0 && ((buf1[byteNr] & applyBitmask) !== (buf2[byteNr] & applyBitmask)))

                        return false;
                    else if (byteNr > 0 && buf1[byteNr] !== buf2[byteNr])
                        return false;
                }

                // console.log("Buffer",buf1,buf2,equal);

                return true;

            };

        // console.log("Page identifier",pageIdentifier);

        // HRM has page toggle bit
        if (isHRM) {

            pageIdentifier += (data[0] & 0x7F); // Stip off msb bit 

        }
        else
            pageIdentifier += data[0];


        if (this.previousPageBroadcast[pageIdentifier])
            previousBroadcastData = this.previousPageBroadcast[pageIdentifier].data;


        if (previousBroadcastData && isEqual(previousBroadcastData, data)) {

            this.previousPageBroadcast[pageIdentifier].duplicate++;


        } else {

            if (previousBroadcastData) {
                this.previousPageBroadcast[pageIdentifier].data = data;
                if (this.previousPageBroadcast[pageIdentifier].duplicate) {
                   // if (this.log.logging) this.log.log('info', 'Received ' + this.previousPageBroadcast[pageIdentifier].duplicate + ' duplicate page broadcast from ' + pageIdentifier);
                    this.previousPageBroadcast[pageIdentifier].duplicate = 0
                }
            } else {
                this.previousPageBroadcast[pageIdentifier] = {
                    data: data,
                    duplicate: 0
                };
            }

        }


        return this.previousPageBroadcast[pageIdentifier].duplicate > 0;
    };

    DeviceProfile.prototype.countBroadcast = function (sensorId) {

        if (this.receivedBroadcastCounter[sensorId])
            this.receivedBroadcastCounter[sensorId]++;
        else
            this.receivedBroadcastCounter[sensorId] = 1;
    }

    DeviceProfile.prototype.verifyDeviceType = function (deviceType, broadcast) {
        var isEqualDeviceType = broadcast.channelId.deviceType === deviceType;

        if (!isEqualDeviceType) {
            if (this.log.logging) this.log.log('error', "Received broadcast from device type 0x" + broadcast.channelId.deviceType.toString(16) + " routing of broadcast is wrong!");
        }

        return isEqualDeviceType;

    };

    DeviceProfile.prototype.channelResponse = function (channelResponse) {
        if (this.log.logging) this.log.log('log', 'DeviceProfile', this, channelResponse, channelResponse.toString());
    };

    // Default behaviour just return JSON of broadcast
    DeviceProfile.prototype.broadCast = function (broadcast) {
        // MAYBE return undefined;
        return JSON.stringify(broadcast);
    };

    DeviceProfile.prototype.getOnPage = function () {
        return this._onPage;
    };

    DeviceProfile.prototype.setOnPage = function (callback) {
        if (typeof callback === 'function') {
            this._onPage = callback;
            if (this.log.logging) this.log.log('log', 'Setting ', this, 'on page for ANT+ callback');
        } else if (this.log.logging)
            this.log.log('error', 'Callback for on page is not a function', typeof callback, callback);
    };

    DeviceProfile.prototype.onPage = function (page) {
        if (typeof this._onPage === 'function')
            this._onPage(page);
        else if (this.log.logging)
            this.log.log('warn', 'No on page callback specified for page ', page);
    };

   
    DeviceProfile.prototype.toString = function ()
    {
        if (this.CHANNEL_ID && (this.CHANNEL_ID.DEVICE_TYPE !== undefined || this.CHANNEL_ID.DEVICE_TYPE !== null))
            return " Device Type " + this.CHANNEL_ID.DEVICE_TYPE;
       
    }

    module.exports = DeviceProfile;

    return module.exports;
});

