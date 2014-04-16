/* global define: true */

define(['logger','events'],function (Logger,EventEmitter) {

    function Channel(configuration) {

        EventEmitter.call(this,configuration);

        this.options = configuration;

        if (!configuration)
            configuration = {};

        configuration.logSource = this;

        this.log = configuration.logger || new Logger(configuration);

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
//        if (!param) {
//            this.log.log('error','No parameters for channel found for configuration '+name);
//            return;
//        }
//        
//    }
    
    Channel.prototype.addConfiguration = function (name, parameters)
    {
        this.parameters[name] = parameters;
    };
    
    Channel.prototype.showConfiguration = function (name) {
        var msg = '';
        var parameters = this.parameters[name];
    
        function format(number) {
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
                for (var periodeNr=0, len = messagePeriod.length; periodeNr < len; periodeNr++) {
                    rate += getInHz(messagePeriod[periodeNr]);
                    if (periodeNr < len -1)
                        rate += ',';
                }
            }
    
               return rate;
        }
    
        function formatSearchTimeout(searchTimeout) {
            
            var friendlyFormat,
                value = searchTimeout;
    
            if (typeof searchTimeout === "undefined")
                return 'undefined';
    
            if (typeof searchTimeout !== 'number')
                value = searchTimeout.getRawValue();
            
                switch (value) {
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
    
        function formatExtendedAssignment(extendedAssignment) {
            if (typeof extendedAssignment === "undefined")
                return 'undefined';
    
            if (typeof extendedAssignment === "string") // Parsing/validation is done when host establish channel
                return extendedAssignment;
    
            if (typeof extendedAssignment === "number")
                return Channel.prototype.EXTENDED_ASSIGNMENT[extendedAssignment];
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
    //
    //
    ////Channel.prototype.setChannelNumer = function (channel) {
    ////    this.channelNumber = channel;
    ////}
    //
    Channel.prototype.EXTENDED_ASSIGNMENT = {
        0x01: "Background Scanning",
        0x04: "Frequency Agility",
        0x10: "Fast Channel Initiation",
        0x20: "Asynchronous Transmission",
        BACKGROUND_SCANNING_ENABLE: 0x01,
        FREQUENCY_AGILITY_ENABLE: 0x04,
        FAST_CHANNEL_INITIATION_ENABLE: 0x10,
        ASYNCHRONOUS_TRANSMISSION_ENABLE: 0x20
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
    Channel.prototype.isMaster = function (configurationName) {
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
    
    Channel.prototype.TYPE = {
    
        // Bidirectional
        0x00: "Bidirectional SLAVE",
        BIDIRECTIONAL_SLAVE_CHANNEL: 0x00, // slave
    
        0x10: "Bidirectional MASTER",
        BIDIRECTIONAL_MASTER_CHANNEL: 0x10, // master
    
        // Unidirectional
        0x50: "MASTER Transmit Only(legacy)",
        MASTER_TRANSMIT_ONLY_CHANNEL: 0x50,
    
        0x40: "SLAVE Receive Only (diagnostic)",
        SLAVE_RECEIVE_ONLY_CHANNEL: 0x40,
    
        // Shared channels
    
        0x20: "Shared bidirectional SLAVE",
        SHARED_BIDIRECTIONAL_SLAVE_CHANNEL: 0x20,
    
        0x30: "Shared bidirectional MASTER",
        SHARED_BIDIRECTIONAL_MASTER_CHANNEL: 0x30
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
    
    return Channel;
      
});
