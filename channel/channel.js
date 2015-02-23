/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require,exports,module){

  var Logger = require('./util/logger'),
      EventEmitter = require('./util/events');

    function Channel(options){

        EventEmitter.call(this,options);

        this.options = options;

        if (!options)
            options = {};

        options.logSource = this;

        this.log = options.logger || new Logger(options);

        this.parameters = {};

    }

    Channel.prototype = Object.create(EventEmitter.prototype);
    Channel.prototype.constructor = Channel;

    Channel.prototype.getConfigurations = function ()
    {
        var conf = [];

        for (var prop in this.parameters)
            if (this.parameters.hasOwnProperty(prop))
                conf.push(prop);

        return conf;


    };

//    Channel.prototype.setChannelId = function (name,deviceNumber,deviceType,transmissionType)
//    {
//        var param = this.parameters[name];
//
//        if (!param)//{
//            this.log.log('error','No parameters for channel found for configuration '+name);
//            return;
//        }
//
//    }

    Channel.prototype.addConfiguration = function (name, parameters)
    {
        this.parameters[name] = parameters;
    };

    Channel.prototype.showConfiguration = function (name){
        var msg = '';
        var parameters = this.parameters[name];

        function format(number){
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
                for (var periodeNr=0, len = messagePeriod.length; periodeNr < len; periodeNr++){
                    rate += getInHz(messagePeriod[periodeNr]);
                    if (periodeNr < len -1)
                        rate += ',';
                }
            }

               return rate;
        }

        function formatSearchTimeout(searchTimeout){

            var friendlyFormat,
                value = searchTimeout;

            if (typeof searchTimeout === "undefined")
                return 'undefined';

            if (typeof searchTimeout !== 'number')
                value = searchTimeout.getRawValue();

                switch (value){
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
