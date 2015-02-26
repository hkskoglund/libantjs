/* global define: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function (require,exports,module){

  'use strict';

  var Logger = require('../util/logger'),
      EventEmitter = require('../util/events'),
      Network = require('./network'),
      ChannelId = require('../messages/configuration/extended/channelId'),
      ChannelState = require('./channelState'),
      LowPrioritySearchTimeout = require('../messages/configuration/util/LowPrioritySearchTimeout'),
      HighPrioritySearchTimeout = require('../messages/configuration/util/HighPrioritySearchTimeout');

    function Channel(options,host,configuration)    {

        EventEmitter.call(this,options);

        if (!options)
            options = {};

        options.logSource = this;

        this.log = options.logger || new Logger(options);

        this.host = options.host;

        this._setConfiguration(configuration);

    /*    this.addConfiguration("slave", {
            description: "Slave configuration for ANT+ "+this.constructor.name,
            networkKey: setting.networkKey["ANT+"],
            //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
            channelType: "slave",
            channelId: { deviceNumber: '*', deviceType: this.CHANNEL_ID.DEVICE_TYPE, transmissionType: '*' },
            RFfrequency: setting.RFfrequency["ANT+"],     // 2457 Mhz ANT +
            LPsearchTimeout: new LowPrioritySearchTimeout(LowPrioritySearchTimeout.prototype.MAX),
            HPsearchTimeout: new HighPrioritySearchTimeout(HighPrioritySearchTimeout.prototype.DISABLED),

            channelPeriod: this.CHANNEL_PERIOD.DEFAULT

        }); */
    }

    Channel.prototype = Object.create(EventEmitter.prototype);
    Channel.prototype.constructor = Channel;

    Channel.prototype._setConfiguration = function(configuration)
    {
      var parameters = {
        channel : undefined,
        net : undefined,
        key : undefined,
        deviceNumber : undefined,
        deviceType : undefined,
        transmissionType : undefined,
        frequency : undefined,
        period : undefined,
        lowPrioritySearchTimeout : undefined,
        highPrioritySearchTimeout : undefined
      };

      if (!configuration)
        configuration = {};

      Object.keys(parameters).forEach(function (value,index,arr){ this[value] = configuration[value]; },this);

      // Special handling

      if (this.lowPrioritySearchTimeout)
        this.lowPrioritySearchTimeout = new LowPrioritySearchTimeout(this.lowPrioritySearchTimeout);

      if (this.highPrioritySearchTimeout)
        this.highPrioritySearchTimeout = new HighPrioritySearchTimeout(this.highPrioritySearchTimeout);

      this.id = new ChannelId(this.deviceNumber,this.deviceType,this.transmissionType);

      this.network = new Network(this.net,this.key);

    };

    Channel.prototype.setNetwork = function (network)
    {
      this.configuration.network = network;
    };

    Channel.prototype.unassign = function (callback)
    {
      this.configuration.channelType = undefined;
      this.configuration.extendedAssignment = undefined;
    //  this.configuration.network = undefined; // Must use setNetwork to specify new network before attempting assign

      host.unAssignChannel(this.configuration.number,callback);
    };

    Channel.prototype.assign = function (channelType,extendedAssignment,callback)
    {
     this.configuration.type = channelType;
     this.configuration.extendedAssignment = extendedAssignment;

      this.host.assignChannel(this.configuration.number,channelType,this.configuration.network.number,extendedAssignment,callback);
    };

    Channel.prototype.setChannelId = function (channelId,callback)
    {
      this.configuration.channelId = channelId;

      host.setChannelId(this.configuration.number,channelId.deviceNumber,channelId.deviceType,channelId.transmissionType,callback);
    };

    Channel.prototype.showConfiguration = function (name)    {
        var msg = '';
        var parameters = this.parameters[name];

        function format(number)        {
            if (number === 0x00)
                return "*";
            else
                return '' + number;
        }

        function formatMessagePeriod(messagePeriod)
        {
            var rate;

            function getInHz (period)
            {
                return period + " " + (32768 / period).toFixed(2) + "Hz";
            }

            if (typeof messagePeriod === "number")
                rate = getInHz(messagePeriod);
            else if (Array.isArray(messagePeriod))
            {

                rate = '';
                for (var periodeNr=0, len = messagePeriod.length; periodeNr < len; periodeNr++)                {
                    rate += getInHz(messagePeriod[periodeNr]);
                    if (periodeNr < len -1)
                        rate += ',';
                }
            }

               return rate;
        }

        function formatSearchTimeout(searchTimeout)        {

            var friendlyFormat,
                value = searchTimeout;

            if (typeof searchTimeout === "undefined")
                return 'undefined';

            if (typeof searchTimeout !== 'number')
                value = searchTimeout.getRawValue();

                switch (value)                {
                    case 0:
                        friendlyFormat = "Disabled";
                        break;
                    case 255:
                        friendlyFormat = "Infinity";
                        break;
                    default:
                        friendlyFormat = value * 2.5 + "s";
                        break;
              }

                return friendlyFormat;

        }


        msg =  name +" ";
        if (parameters.description)
            msg += parameters.description + " ";

        msg +=  parameters.channelId.toString()+
            ' RF ' + (parameters.RFfrequency + 2400) + 'MHz Tch ' + formatMessagePeriod(parameters.channelPeriod);

        if (parameters.LPsearchTimeout)
            msg += ' LP '+ formatSearchTimeout(parameters.LPsearchTimeout);

        if (parameters.HPsearchTimeout)
            msg += ' HP ' + formatSearchTimeout(parameters.HPsearchTimeout);

        if (parameters.extendedAssignment)
            msg += ' ext.Assign ' + formatExtendedAssignment(parameters.extendedAssignment);

        return msg;
    };



//    Channel.prototype.EVENT = {
//
//        // Event and responses
//        CHANNEL_RESPONSE_EVENT: "channelResponseEvent",
//
//        // Data
//
//        BROADCAST: "broadcast",
//        BURST : "burst"
//    };

    // Check for a bidirectional master channel
    Channel.prototype.isMaster = function (configurationName){
        var parameters = this.parameters[configurationName],
            channelType = parameters.channelType;

        if (typeof channelType === "undefined")
            return false;

        if (typeof channelType === 'number')
            return (channelType === Channel.prototype.TYPE.BIDIRECTIONAL_MASTER_CHANNEL);
        else if (channelType === 'master')
            return true;
        else return false;

    };



    // Default
    Channel.prototype.channelResponse = function (channelResponse)
    {
        return undefined;
    };

    // Default
    Channel.prototype.broadCast = function (broadcast)
    {
        return undefined;

    };

    module.export = Channel;
    return module.export;

});
