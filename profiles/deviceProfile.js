/* global define: true, clearInterval: true, setInterval: true, setTimeout: true */

define(['channel','profiles/Page'],function (Channel, GenericPage) {

    'use strict';

    function DeviceProfile(configuration) {

        Channel.call(this, configuration);
     
        this.receivedBroadcastCounter = {};

        this.previousPageBroadcast = {}; // Just declare property

        // Storage for parsed received main and background pages for each sensorId
        this.pages = {};

        // Timers

        this.timer = {};

        // Reference to pages by page number index

        this.pageNumberPages = {};

    }

    DeviceProfile.prototype = Object.create(Channel.prototype);
    DeviceProfile.prototype.constructor = DeviceProfile;

    DeviceProfile.prototype.stop = function () {
        if (this.timer.onPage !== undefined)
            clearInterval(this.timer.onPage);
        
        this.removeAllEventListeners('page');
    };

    DeviceProfile.prototype.getLatestPage = function ()
    {
        var aggregatedRR,
            RRInterval,
            receivedPageNr,
            dataPageNumber,
            len,
            currentPages,
            receivedPagesByPageNr,
            latestPage,
            typeValue,
            sensorId,
            LIMIT = 2; // Filter out possible "noise" from sensors that come and go quickly

                for (sensorId in this.pages)
                {

                    if (this.receivedBroadcastCounter[sensorId] >= LIMIT) {
                        
                        // Initialize for new sensor id
                       
                        if (!this.pageNumberPages[sensorId])
                            this.pageNumberPages[sensorId] = {};

                        for (var type in GenericPage.prototype.TYPE) {

                            typeValue = GenericPage.prototype.TYPE[type]; // "main" or "background"

                            this.pageNumberPages[sensorId][typeValue] = {};

                            // Organize pages by page number (by default available on sensors conforming to ANT+ message format)
                            
                            currentPages = this.pages[sensorId][typeValue];

                            for (len = currentPages.length, receivedPageNr = 0; receivedPageNr < len ; receivedPageNr++) {

                                dataPageNumber = currentPages[receivedPageNr].number; // If .number is not available will index by "undefined"
                                receivedPagesByPageNr = this.pageNumberPages[sensorId][typeValue][dataPageNumber];

                                if (!receivedPagesByPageNr) {
                                    receivedPagesByPageNr = [];
                                    this.pageNumberPages[sensorId][typeValue][dataPageNumber] = receivedPagesByPageNr;
                                }

                                receivedPagesByPageNr.push(currentPages[receivedPageNr]);
                              
                            }

                            // Traverse pages number, and emit 'page' event (e.g handler in UI) with the latest page

                            for (var pageNumber in this.pageNumberPages[sensorId][typeValue]) {
                                
                                if (pageNumber === undefined || pageNumber === null)
                                {
                                    if (this.log && this.log.logging)
                                        this.log.log('warn', 'Undefined or null page number for sensor id ' + sensorId + ' page type ' + typeValue);
                                }

                                len = this.pageNumberPages[sensorId][typeValue][pageNumber].length;
                                latestPage = this.pageNumberPages[sensorId][typeValue][pageNumber][len-1];

                                // Aggregate RR interval data

                                if (latestPage && typeValue === GenericPage.prototype.TYPE.MAIN && this.CHANNEL_ID.DEVICE_TYPE === 120 && (latestPage.RRInterval >= 0)) {
                                  
                                    aggregatedRR = [];

                                    for (receivedPageNr = 0; receivedPageNr < len; receivedPageNr++)
                                    {
                                        RRInterval = this.pageNumberPages[sensorId][typeValue][pageNumber][receivedPageNr].RRInterval;

                                        if (RRInterval >= 0) {

                                            aggregatedRR.push(RRInterval);
                                            //if (this.log && this.log.logging)
                                            //    this.log.log('info', receivedPageNr, RRInterval);
                                        }
                                        //else
                                        //{
                                        //    if (this.log && this.log.logging)
                                        //        this.log.log('error', 'Was expecting an RR interval on page', this.pageNumberPages[sensorId][typeValue][pageNumber][receivedPageNr])
                                        //}

                                    }
                                       
                                    latestPage.aggregatedRR = aggregatedRR;
                                }
                                
                                if (latestPage) 
                                    this.emit('page',latestPage);
                                  
                            }

                            if (currentPages.length > 0)
                                this.pages[sensorId][typeValue] = []; // Now pages are candidates for garbage removal

                        }

                    }
                }
    };

    DeviceProfile.prototype.requestPageUpdate = function _requestPageUpdate(timeout) {


        // In case requestPageUpdate is called more than one time
        if (this.timer.onPage !== undefined) {
            if (this.log && this.log.logging) this.log.log('warn', 'requestPageUpdate should only be called one time');
            clearInterval(this.timer.onPage);
        }

        this.timer.onPage = setInterval(this.getLatestPage.bind(this),timeout);
         
        if (this.log && this.log.logging) this.log.log('info', 'Requested page update each ' + timeout + ' ms. Timer id ' + this.timer.onPage);

        setTimeout(this.getLatestPage.bind(this),1000); // Run fast update first time

    };

    DeviceProfile.prototype.addPage = function (page) {
        var sensorId = page.broadcast.channelId.sensorId;

        page.timestamp = Date.now();

        if (this.pages[sensorId])
            this.pages[sensorId][page.type].push(page);
        else {
            this.pages[sensorId] = {};
            for (var type in GenericPage.prototype.TYPE)
                this.pages[sensorId][GenericPage.prototype.TYPE[type]] = [];

        }
    };

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
                    this.previousPageBroadcast[pageIdentifier].duplicate = 0;
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
        else {
            
            this.receivedBroadcastCounter[sensorId] = 1;
        }
            
    };

    DeviceProfile.prototype.verifyDeviceType = function (deviceType, broadcast) {
        var isEqualDeviceType = broadcast.channelId.deviceType === deviceType;

        if (!isEqualDeviceType) {
            if (this.log && this.log.logging) this.log.log('error', "Received broadcast from device type 0x" + broadcast.channelId.deviceType.toString(16) + " routing of broadcast is wrong!");
        }

        return isEqualDeviceType;

    };

    DeviceProfile.prototype.channelResponse = function (channelResponse) {
        // Issue IE11 - this passed as argument to log is undefined (most likely due to strict mode)
        if (this.log && this.log.logging) this.log.log('log', 'Channel response - DeviceProfile -', this, channelResponse, channelResponse.toString());
    };

    // Default behaviour just return JSON of broadcast
    DeviceProfile.prototype.broadCast = function (broadcast) {
        // MAYBE return undefined;
        return JSON.stringify(broadcast);
    };

    DeviceProfile.prototype.toString = function ()
    {
        if (this.CHANNEL_ID && (this.CHANNEL_ID.DEVICE_TYPE !== undefined || this.CHANNEL_ID.DEVICE_TYPE !== null))
            return " Device Type " + this.CHANNEL_ID.DEVICE_TYPE;
       
    };

   return DeviceProfile;

});
