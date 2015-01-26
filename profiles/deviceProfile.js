/* global define: true, clearInterval: true, setInterval: true, setTimeout: true  */

define(['channel','profiles/Page','profiles/mainPage','profiles/backgroundPage','messages/HighPrioritySearchTimeout','messages/LowPrioritySearchTimeout','settings',

        'profiles/manufacturerId','profiles/productId','profiles/cumulativeOperatingTime',
        'profiles/manufacturerId0x50','profiles/productId0x51','profiles/cumulativeOperatingTime0x52'],function (Channel, GenericPage,MainPage,BackgroundPage,HighPrioritySearchTimeout,LowPrioritySearchTimeout,setting,
ManufacturerId,ProductId,CumulativeOperatingTime,ManufacturerId0x50,ProductId0x51,CumulativeOperatingTime0x52) {

    'use strict';

    function DeviceProfile(configuration) {

        Channel.call(this, configuration);

        // Unfiltered broadcasts
        this.broadcast = [] ;

        this.broadcastCount = 0;

        // Hashed broadcasts - for detecting and filtering similar broadcasts/used
        this.hashBroadcast = [];

        // Latest page by pageNumber
        this.page =  {
           // pageNumber : ...
        };

       this.receivedPage = [];

        // Timers

        this.timer = {};

        if (this.PAGE_TOGGLE_CAPABLE) {
        // For determining if 7 msb is toggeled of byte 0 in payload
             this.pageToggle = {
                 toggle : undefined,
                 state : this.PAGE_TOGGLE_STATE.PREINIT,
                 broadcast : {}
             };
        }
        else if (this.log && this.log.logging) {
            this.log.log('info','Device is not capable of page toggeling',this);
        }
        this.sensorId = undefined;

    }

    DeviceProfile.prototype = Object.create(Channel.prototype);
    DeviceProfile.prototype.constructor = DeviceProfile;

    DeviceProfile.prototype.PAGE_TOGGLE_STATE = {

        PREINIT : 'preinit', // Before any page toggeling is observed
        INIT : 'init',
        TOGGELING : 'toggeling',
        NOT_TOGGELING : 'not toggeling',

    };

    DeviceProfile.prototype.MAX_UNFILTERED_BROADCAST_BUFFER = 240; // 4 msg/sec * 60 sec = 240 broadcast/min

    DeviceProfile.prototype.MIN_BROADCAST_THRESHOLD = 2; // Minimum number of broadcast before accepted

    // Is called by a particular device profile after reading pageNumber
    DeviceProfile.prototype.getBackgroundPage = function (broadcast,pageNumber)
    {

       var  page;

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

                case BackgroundPage.prototype.COMMON.PAGE0x50:

                    page = new ManufacturerId0x50({ log: this.log.logging }, broadcast,this,pageNumber);

                    break;

                case BackgroundPage.prototype.COMMON.PAGE0x51:

                    page = new ProductId0x51({ log: this.log.logging }, broadcast,this,pageNumber);

                    break;

                case BackgroundPage.prototype.COMMON.PAGE0x52:

                    page = new CumulativeOperatingTime0x52({ log: this.log.logging }, broadcast,this,pageNumber);

                    break;

            }


        if (!page)
        {
            this.log.log('error', 'Unable to create background page object for page number ', pageNumber + ' 0x' + pageNumber.toString(16),broadcast);
        }

        return page;

    };

    /* jshint ignore: start */
    DeviceProfile.prototype.getPageNumber = function (broadcast)
    {

       throw new Error('Should be overridden in descendants');

    };
    /* jshint ignore: end */

    // Determine page toggle state (tricky format leads to tricky code...), e.g HRM legacy (no toggeling/page 0), vs HRM (toggeling page 4 + background pages)
    DeviceProfile.prototype.pageToggleFilter = function (broadcast)
    {
        var pageToggleBit,
            data = broadcast.data,
            sensorId = this.sensorId,
            FILTER = true,
            MAX_PAGE_TOGGLE_BROADCAST_LIMIT = this.MIN_BROADCAST_THRESHOLD+5,
            transitionMsg;

        // Determine page toggle bit - legacy transmitters (bike/hrm) has fixed bit in this position (7 msb byte 0) and only page "0"/undefined

            pageToggleBit = (data[0] & GenericPage.prototype.BIT_MASK.PAGE_TOGGLE) === GenericPage.prototype.BIT_MASK.PAGE_TOGGLE ? true : false;

            // Init page toggle on the first broadcast

            if (this.pageToggle.state === this.PAGE_TOGGLE_STATE.PREINIT) {

                this.pageToggle.toggle = pageToggleBit;
                this.pageToggle.state = this.PAGE_TOGGLE_STATE.INIT;
                this.pageToggle.broadcast[this.pageToggle.state] = broadcast;

                return FILTER;
            }

            // Determine if page toggle bit have changed from the initialized state

            if ((this.pageToggle.state === this.PAGE_TOGGLE_STATE.INIT) && (pageToggleBit !== this.pageToggle.toggle))
            {

                switch (pageToggleBit)
                {
                    case true : transitionMsg = 'OFF -> ON';
                                break;
                    case false: transitionMsg = 'ON -> OFF';
                                break;
                }

                this.pageToggle.toggle = pageToggleBit;

                this.pageToggle.state = this.PAGE_TOGGLE_STATE.TOGGELING;
                 this.pageToggle.broadcast[this.pageToggle.state] = broadcast;

                if (this.log && this.log.logging) {
                     this.log.log('info',sensorId,'Page toggeling '+transitionMsg+' at B# '+this.broadcastCount,this.pageToggle.broadcast[this.pageToggle.state].data,'init B# '+this.pageToggle.broadcast[this.PAGE_TOGGLE_STATE.INIT].count,this.pageToggle.broadcast[this.PAGE_TOGGLE_STATE.INIT].data);
                }
            }

            // Filter until a page toggeling master is found or not. A well behaved master should toggle page bit after four messages (about each seconds)

            if ((this.pageToggle.state === this.PAGE_TOGGLE_STATE.INIT) && this.broadcastCount < MAX_PAGE_TOGGLE_BROADCAST_LIMIT) {
              return FILTER;
            }
            // If we're still in init state after 5 messages, it can be assumed that we have to deal with a non toggeling/legacy master

            if (this.pageToggle.state === this.PAGE_TOGGLE_STATE.INIT)
            {
                this.pageToggle.state = this.PAGE_TOGGLE_STATE.NOT_TOGGELING;
                  this.pageToggle.broadcast[this.pageToggle.state] = broadcast;

                if (this.log && this.log.logging) {
                    this.log.log('info',sensorId,'No page toggeling after B# '+this.broadcastCount,this.pageToggle.broadcast[this.pageToggle.state].data,'Its a legacy device using page 0 format','init B# '+this.pageToggle.broadcast[this.PAGE_TOGGLE_STATE.INIT].count,this.pageToggle.broadcast[this.PAGE_TOGGLE_STATE.INIT].data);
                }
            }
    };

    DeviceProfile.prototype.filterAndCountBroadcast = function (broadcast)
    {

        var FILTER = true;

        // Don't process broadcast with wrong device type

        if (!this.verifyDeviceType(this.CHANNEL_ID.DEVICE_TYPE, broadcast)) {
            return FILTER;
        }


        // Limit memory footprint
        if (this.broadcast.length >= this.MAX_UNFILTERED_BROADCAST_BUFFER)
        {
           this.broadcast.shift();
        }

        this.broadcastCount += 1;
        broadcast.count = this.broadcastCount;

        this.broadcast.push(broadcast);

        // 1. Filter out possible "noise" from sensors that come and go quickly

        if (this.broadcastCount < this.MIN_BROADCAST_THRESHOLD) {
           return FILTER;
        }

        // 2. Filter until page toggle state is determined for masters that a capable of it

        if (this.PAGE_TOGGLE_CAPABLE && this.pageToggleFilter(broadcast)) {
           return FILTER;

        }

        // 3. Filter duplicates

        if (this.filterDuplicateBroadcast(broadcast)) {
           return FILTER;
        } else {
           return !FILTER;
        }
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

        if (this.timer.onPage !== undefined) {
            clearInterval(this.timer.onPage);
        }
        
        this.removeAllEventListeners('page');

    };

    // This function is called by setInterval, e.g each second to get the latest pages of main/background
    DeviceProfile.prototype.getLatestPage = function (processCB)
    {

    var latestPage,
        pageNumber;

       for (pageNumber in this.page) {

            if (pageNumber === undefined || pageNumber === null)
            {
                if (this.log && this.log.logging) {
                    this.log.log('warn', 'Undefined or null page number for sensor id ' + this.sensorId);
                }
            }

            latestPage = this.page[pageNumber];

            if (latestPage)
            {
                if (typeof processCB === 'function') {// In case of HRM RR -> aggregated RR attached
                  processCB.call(this,latestPage);
                }

                this.emit('page',latestPage);

                this.page[pageNumber] = null;

            }

        }

 };

    DeviceProfile.prototype.requestPageUpdate = function _requestPageUpdate(timeout,processHook) {

        // In case requestPageUpdate is called more than one time

        if (this.timer.onPage !== undefined) {
            if (this.log && this.log.logging) { this.log.log('warn', 'requestPageUpdate should only be called one time');}
            clearInterval(this.timer.onPage);
        }

        this.timer.onPage = setInterval(this.getLatestPage.bind(this,processHook),timeout);
         
        if (this.log && this.log.logging) {
            this.log.log('info', 'Requested page update each ' + timeout + ' ms. Timer id ' + this.timer.onPage);
        }

        setTimeout(this.getLatestPage.bind(this,processHook),1000); // Run fast update first time

    };

    DeviceProfile.prototype.getPreviousPageValidateRolloverTime = function()
    {

       var previousPage =  this.getPreviousPage(),
           rollOverThreshold = this.ROLLOVER_THRESHOLD;

        // Initialy we have no previous page to base our calculations, so have to check for previous page

        if (!previousPage) {
          return;
        }

        // Don't attempt to calculate cadence and speed if time between pages is greater than rollover time

        if (rollOverThreshold && (this.timestamp - previousPage.timestamp >= rollOverThreshold)) {
            if (this.log.logging) {
                this.log.log('warn', 'Time between pages is longer than the rollover threshold (64s), skipped cadence and speed calculation', this.page, previousPage);
            }
            return;
        }

        return previousPage;
    };

    DeviceProfile.prototype.getPreviousPage = function ()
    {
         return this.receivedPage[this.receivedPage.length-1];

    };

    // Deserialization of broadcast (8-byte packet) into a page object
    /* jshint ignore: start */
    DeviceProfile.prototype.getPage = function (broadcast)
    {
        throw new Error('getPage should be overridden in descendants');
    };
    /* jshint ignore: end */

    // Filter and deserialize into page object
    DeviceProfile.prototype.broadCast = function (broadcast)
    {

        var page;

        // Init sensor id first time a broadcast is received

        if (!this.sensorId) {
          this.sensorId = broadcast.channelId.sensorId;
        }

        // Add filtering for duplicate broadcasts

        if (this.filterAndCountBroadcast(broadcast)) {

           if (this.broadcastCount < 10 && this.log && this.log.logging)  {// Debug page toggeling detection
              this.log.log('info','Filtering B#',this.broadcastCount,broadcast.channelId.sensorId,broadcast.data);
           }
           return;
        }

        // Verify that latest pages are emitted
        if (this.timer.onPage === undefined)
        {
            if (this.log && this.log.logging)
            {
                this.log.log('error','No onPage callback available to send latest main/background pages');
                if (this.DEFAULT_PAGE_UPDATE_DELAY)
                {
                    this.log.log('info','Found DEFAULT_PAGE_UPDATE_DELAY = '+this.DEFAULT_PAGE_UPDATE_DELAY+', requesting page update');
                    this.requestPageUpdate(this.DEFAULT_PAGE_UPDATE_DELAY);
                } else {
                   this.log.log('info','No DEFAULT_PAGE_UPDATE_DELAY, cannot emit latest page');
                }
            }
        }

        page = this.getPage(broadcast);

        this.addPage(page);

    };

    // Keeps track of received pages that are passed through filtering
    DeviceProfile.prototype.addPage = function (page) {

        if (!page) {
         if (this.log && this.log.logging) {
            this.log.log('error', 'Attempt to add undefined or null page, skipping');
         }
            return;
        }

       this.page[page.number] = page;

        // Limit memory
        if (this.receivedPage && this.receivedPage.length >= this.MAX_UNFILTERED_BROADCAST_BUFFER)
        {
            this.receivedPage.shift();
        }

       this.receivedPage.push(page);

    };

    DeviceProfile.prototype.isPageToggle = function ()
    {

        if (this.PAGE_TOGGLE_CAPABLE) {
             return  this.pageToggle.state === this.PAGE_TOGGLE_STATE.TOGGELING;
        }
        else {
            return false;
        }
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
            if (byteNr === 0 && isPageToggle) {
                currentByte = data[byteNr] & 0x7F;
            } else {
               currentByte = data[byteNr];
            }
            // Zero padding
            if (currentByte < 0xF) {
                hashCode += '0';
            }

            hashCode += Number(currentByte).toString(16);
        }

        return 'hash'+hashCode;
    };

    // FILTER - Skip duplicate messages from same master
    DeviceProfile.prototype.filterDuplicateBroadcast = function (broadcast) {

        var hashCode = this.getHashCode(broadcast); // hash+8 hex code of broadcast payload

        // We have a previous broadcast with the same hashcode -> filter

        if (this.hashBroadcast.indexOf(hashCode) !== -1) {
            return true;
        }

        this.hashBroadcast.push(hashCode);

        // 8 should allow for 2 seconds lookback at 4Hz (1 sec. with background and 1 sec main)
        if (this.hashBroadcast.length > 8) {
            this.hashBroadcast.shift();
        }

        return false;

    };

    DeviceProfile.prototype.verifyDeviceType = function (deviceType, broadcast) {

        var isEqualDeviceType = broadcast.channelId.deviceType === deviceType;

        if (!isEqualDeviceType) {
            if (this.log && this.log.logging) {
                this.log.log('error', "Received broadcast from device type 0x" + broadcast.channelId.deviceType.toString(16) + " routing of broadcast is wrong!");
            }
        }

        return isEqualDeviceType;

    };

    DeviceProfile.prototype.channelResponse = function (channelResponse) {
        // Issue IE11 - this passed as argument to log is undefined (most likely due to strict mode)
        if (this.log && this.log.logging) { this.log.log('log', 'Channel response - DeviceProfile -', this, channelResponse, channelResponse.toString());
                                          }
    };

    DeviceProfile.prototype.toString = function ()
    {
        if (this.CHANNEL_ID && (this.CHANNEL_ID.DEVICE_TYPE !== undefined || this.CHANNEL_ID.DEVICE_TYPE !== null))
        {
            return " Device Type " + this.CHANNEL_ID.DEVICE_TYPE;
        }
    };

   return DeviceProfile;

});
