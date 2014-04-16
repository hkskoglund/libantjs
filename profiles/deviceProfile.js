/* global define: true, clearInterval: true, setInterval: true, setTimeout: true,  */

define(['channel','profiles/Page','messages/HighPrioritySearchTimeout','messages/LowPrioritySearchTimeout','settings',
        'profiles/receivedPages',
        'profiles/manufacturerId','profiles/productId','profiles/cumulativeOperatingTime',
        'profiles/manufacturerId0x50','profiles/productId0x51','profiles/cumulativeOperatingTime0x52'],function (Channel, GenericPage,HighPrioritySearchTimeout,LowPrioritySearchTimeout,setting,ReceivedPages,
ManufacturerId,ProductId,CumulativeOperatingTime,ManufacturerId0x50,ProductId0x51,CumulativeOperatingTime0x52) {

    'use strict';

    function DeviceProfile(configuration) {

        Channel.call(this, configuration);

        // Unfiltered broadcasts
        this.broadcast = [] ;

        this.broadcastCount = 0;

        // Hashed broadcasts - for detecting similar broadcasts/used for filtering
        this.hashBroadcast = [];

        // Filtered broadcasts -  Storage for parsed received main and background pages for each sensorId
        this.page =  new ReceivedPages();

        // Timers

        this.timer = {};

        if (this.PAGE_TOGGLE_CAPABLE)
             this.pageToggle = {
                 toggle : undefined
             }; // For determining if 7 msb is toggeled of byte 0 in payload
        else if (this.log && this.log.logging)
            this.log.log('info','Device is not capable of page toggeling',this);

    }

    DeviceProfile.prototype = Object.create(Channel.prototype);
    DeviceProfile.prototype.constructor = DeviceProfile;

    DeviceProfile.prototype.PAGE_TOGGLE_STATE = {
        INIT : 'init',
        TOGGELING : 'toggeling',
        NOT_TOGGELING : 'not toggeling',

    };

    DeviceProfile.prototype.MAX_UNFILTERED_BROADCAST = 10000;

    // Is called by a particular device profile after reading pageNumber
    DeviceProfile.prototype.getCommonPage = function (broadcast,pageNumber)
    {
       var hasGlobalPages = broadcast.channelId.hasGlobalPages();

        if (!hasGlobalPages)
            return undefined;

       var   page;

        switch (pageNumber) {

              case 1:

                page = new CumulativeOperatingTime({ logger: this.log }, broadcast,this,pageNumber);

                break;

            case 2:

                page = new ManufacturerId({ logger: this.log }, broadcast,this,pageNumber);

                break;


            case 3:

                page = new ProductId({ logger: this.log }, broadcast,this,pageNumber);

                break;

            case GenericPage.prototype.COMMON.PAGE0x50:

                page = new ManufacturerId0x50({ log: this.log.logging }, broadcast,this,pageNumber);

                break;

            case GenericPage.prototype.COMMON.PAGE0x51:

                page = new ProductId0x51({ log: this.log.logging }, broadcast,this,pageNumber);

                break;

            case GenericPage.prototype.COMMON.PAGE0x52:

                page = new CumulativeOperatingTime0x52({ log: this.log.logging }, broadcast,this,pageNumber);

                break;

            default:

                this.log.log('error', 'Unable to create page object for common page number ', pageNumber + ' 0x' + pageNumber.toString(16),broadcast);

                break;

        }

        return page;

    };

    DeviceProfile.prototype.getPageNumber = function (broadcast)
    {
       throw new Error('Should be overridden in descendants');
    };

    DeviceProfile.prototype.filterAndCountBroadcast = function (broadcast)
    {
        var sensorId = broadcast.channelId.sensorId,
            data = broadcast.data,
            FILTER = true,
            pageToggleBit;

        // Don't process broadcast with wrong device type

        if (!this.verifyDeviceType(this.CHANNEL_ID.DEVICE_TYPE, broadcast))
            return FILTER;


        // Limit memory footprint
        if (this.broadcast.length > this.MAX_UNFILTERED_BROADCAST)
        {
           this.broadcast = [];  // GC old broadcasts
        }

        this.broadcast.push(broadcast);
        this.broadcastCount += 1;

        if (this.PAGE_TOGGLE_CAPABLE) {

            // Determine page toggle bit - legacy transmitters (bike/hrm) has fixed bit in this position (7 msb byte 0) and only page "0"/undefined

            pageToggleBit = (data[0] & GenericPage.prototype.BIT_MASK.PAGE_TOGGLE) === GenericPage.prototype.BIT_MASK.PAGE_TOGGLE ? true : false;

            // Init page toggle on the first broadcast

            if (this.pageToggle.toggle === undefined) {

                this.pageToggle.toggle = pageToggleBit;
                this.pageToggle.state = this.PAGE_TOGGLE_STATE.INIT;

                return FILTER;
            }

            // Determine if page toggle bit have changed from the initialized state

            if (this.pageToggle.state === this.PAGE_TOGGLE_STATE.INIT && pageToggleBit !== this.pageToggle.toggle)
            {
                if (this.log && this.log.logging)
                    this.log.log('info',sensorId,'This device uses paging, cycling between main and background pages with page numbers');

                this.pageToggle.state = this.PAGE_TOGGLE_STATE.TOGGELING;
            }

            // Filter until a page toggeling master is found or not. A well behaved master should toggle page bit after four messages (about each seconds)

            if ((this.pageToggle.state === this.PAGE_TOGGLE_STATE.INIT) && this.broadcastCount < 5)
              return FILTER;

            // If we're still in init state after 5 messages, it can be assumed that we have to deal with a non toggeling/legacy master

            if (this.pageToggle.state === this.PAGE_TOGGLE_STATE.INIT)
            {
                this.pageToggle.state = this.PAGE_TOGGLE_STATE.NOT_TOGGELING;

                if (this.log && this.log.logging)
                    this.log.log('info',sensorId,'No page toggeling is observed after '+this.broadcastCount+' broadcasts, maybe its a legacy device');

            }
        }

      if (this.filterDuplicateBroadcast(broadcast))
        return FILTER;
     else
        return !FILTER;

    };

    DeviceProfile.prototype.initMasterSlaveConfiguration = function ()
    {

        this.addConfiguration("slave", {
            description: "Slave configuration for ANT+ "+this.constructor.name,
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: this.CHANNEL_ID.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            LPsearchTimeout: new LowPrioritySearchTimeout(LowPrioritySearchTimeout.prototype.MAX),
            HPsearchTimeout: new HighPrioritySearchTimeout(HighPrioritySearchTimeout.prototype.DISABLED),

            channelPeriod: this.CHANNEL_PERIOD.DEFAULT

        });

        this.addConfiguration("master", {
            description: "Master configuration for ANT+ "+this.constructor.name,
            networkKey: setting.networkKey["ANT+"],

            channelType: "master",
            channelId: { deviceNumber: 'serial number', deviceType: this.CHANNEL_ID.DEVICE_TYPE, transmissionType: this.CHANNEL_ID.TRANSMISSION_TYPE },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +

            channelPeriod: this.CHANNEL_PERIOD.DEFAULT

        });

    };

    DeviceProfile.prototype.stop = function () {
        if (this.timer.onPage !== undefined)
            clearInterval(this.timer.onPage);
        
        this.removeAllEventListeners('page');
    };

    DeviceProfile.prototype.getLatestPage = function ()
    {

       // return; // DEBUG memory

        var aggregatedRR,
            RRInterval,
            receivedPageNr,
            dataPageNumber,
            len,
            currentPages,
            pageByPageNr,
            latestPage,
            typeValue,
            sensorId,
            previousPage,
            LIMIT = 2; // Filter out possible "noise" from sensors that come and go quickly


            if (this.broadcastCount < LIMIT)
                return;

            for (var type in GenericPage.prototype.TYPE) {

                    typeValue = GenericPage.prototype.TYPE[type]; // "main" or "background"

                    // Traverse pages number, and emit 'page' event (e.g handler in UI) with the lacurrentByte page

                    for (var pageNumber in this.page[typeValue]) {

                        if (pageNumber === undefined || pageNumber === null)
                        {
                            if (this.log && this.log.logging)
                                this.log.log('warn', 'Undefined or null page number for sensor id ' + sensorId + ' page type ' + typeValue);
                        }

                        latestPage = this.page[typeValue][pageNumber].pop();


                       /* // Aggregate RR interval data

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
                        }*/

                        if (latestPage)
                            this.emit('page',latestPage);


                    }

            }


      //  this.page = {}; // Forget all, let GC do its job

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

    DeviceProfile.prototype.getPreviousPageValidateRolloverTime = function()
    {

       var previousPage =  this.getPreviousPage(),
           rollOverThreshold = this.ROLLOVER_THRESHOLD;

        // Initialy we have no previous page to base our calculations, so have to check for previous page

        if (!previousPage)
          return;

        // Don't attempt to calculate cadence and speed if time between pages is greater than rollover time

        if (rollOverThreshold && (this.timestamp - previousPage.timestamp >= rollOverThreshold)) {
            if (this.log.logging) this.log.log('warn', 'Time between pages is longer than the rollover threshold (64s), skipped cadence and speed calculation', this.page, this.previousPage);
            return;
        }

        return previousPage;
    };

    DeviceProfile.prototype.getPreviousPage = function ()
    {

        if (this.page && this.page.all)
           return this.page.all[this.page.all.length-1];
        else
            return undefined;
    };

    // Deserialization of broadcast (8-byte packet) into a page object
    DeviceProfile.prototype.getPage = function (broadcast)
    {
        throw new Error('getPage should be overridden in descendants');
    };

    DeviceProfile.prototype.broadCast = function (broadcast)
    {
        if (this.filterAndCountBroadcast(broadcast))
           return;

        var page = this.getPage(broadcast);

        this.addPage(page);

    };

    // Mixin for mix in of methods from main pages into background pages
    DeviceProfile.prototype.mixin = function(target,source)
    {
        for (var property in source)

               if (target[property] === undefined && typeof source[property] === 'function' && property !== 'constructor') // Don't allow override
                  target[property] = source[property];
                else
                  {
                      if (this.log && this.log.logging)
                         this.log.log('warn','Property '+property+' already defined on target','source',source);
                  }
    };

    DeviceProfile.prototype.addPage = function (page) {

        var pageNumber,
            previousPage,
            len;

        if (!page) {
         if (this.log && this.log.logging)
            this.log.log('error', 'Attempt to add undefined or null page, skipping');
            return;
        }


        pageNumber = page.number;



         if (!this.page[page.type][pageNumber]) {
             this.page[page.type][pageNumber] = [];

         }

          this.page[page.type][pageNumber].push(page);

          this.page.all.push(page);

    };

    DeviceProfile.prototype.isPageToggle = function ()
    {

        if (this.PAGE_TOGGLE_CAPABLE)
             return  this.pageToggle.state === this.PAGE_TOGGLE_STATE.TOGGELING;
        else
            return false;
    };


    DeviceProfile.prototype.getHashCode = function (broadcast)
    {
        var byteNr,
            data = broadcast.data,
            hashCode = '',
            currentByte,
            isPageToggle = this.isPageToggle();

        for (byteNr=0; byteNr < data.length; byteNr++)
        {

            // Strip off page toggle bit if neccessary
            if (byteNr === 0 && isPageToggle)
                currentByte = data[byteNr] & 0x7F;
            else
               currentByte = data[byteNr];

            // Zero padding
            if (currentByte < 0xF)
                hashCode += '0';

            hashCode += Number(currentByte).toString(16);
        }

        return 'hash'+hashCode;
    };

    // FILTER - Skip duplicate messages from same master
    DeviceProfile.prototype.filterDuplicateBroadcast = function (broadcast) {

        var hashCode = this.getHashCode(broadcast); // hash+8 hex code of broadcast payload

        // We have a previous broadcast with the same hashcode -> filter

        if (this.hashBroadcast.indexOf(hashCode) !== -1)
            return true;

        this.hashBroadcast.push(hashCode);

        // 8 should allow for 2 seconds lookback at 4Hz (1 sec. with background and 1 sec main)
        if (this.hashBroadcast.length > 8)
            this.hashBroadcast.shift();

        return false;

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

    DeviceProfile.prototype.toString = function ()
    {
        if (this.CHANNEL_ID && (this.CHANNEL_ID.DEVICE_TYPE !== undefined || this.CHANNEL_ID.DEVICE_TYPE !== null))
            return " Device Type " + this.CHANNEL_ID.DEVICE_TYPE;
       
    };

   return DeviceProfile;

});
