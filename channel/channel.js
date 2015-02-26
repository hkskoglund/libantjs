/* global define: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function (require,exports,module){

  'use strict';

  var Logger = require('../util/logger'),
      EventEmitter = require('../util/events'),
      Network = require('./network'),
      ChannelId = require('../messages/configuration/extended/channelId'),
      ChannelState = require('./channelState'),
      ChannelType = require('./channelType'),
      LowPrioritySearchTimeout = require('../messages/configuration/util/LowPrioritySearchTimeout'),
      HighPrioritySearchTimeout = require('../messages/configuration/util/HighPrioritySearchTimeout'),
      ExtendedAssignment = require('./extendedAssignment');

    function Channel(options,host,channel)    {

        EventEmitter.call(this,options);

        if (!options)
            options = {};

        options.logSource = this;

        this.log = options.logger || new Logger(options);

        this.host = host; // Allows access to host API for channel object (wrappers)

        this.channel = channel;

    }

    Channel.prototype = Object.create(EventEmitter.prototype);
    Channel.prototype.constructor = Channel;

    // Supports initialization as an object literal
    Channel.prototype.setConfiguration = function(configuration)
    {

      if (!configuration)
        return;

      if (configuration.type)
        this.type = new ChannelType(configuration.type);

      if (configuration.network)
         this.network = new Network(configuration.network.number,configuration.network.key);

      if (configuration.id)
        this.id = new ChannelId(this.id.deviceNumber,this.id.deviceType,this.id.transmissionType);

      if (configuration.lowPrioritySearchTimeout)
        this.lowPrioritySearchTimeout = new LowPrioritySearchTimeout(configuration.lowPrioritySearchTimeout);

      if (configuration.highPrioritySearchTimeout)
        this.highPrioritySearchTimeout = new HighPrioritySearchTimeout(configuration.highPrioritySearchTimeout);

      if (configuration.extendedAssignment)
        this.extendedAssignment = new ExtendedAssignment(configuration.extendedAssignment);
    };

    Channel.prototype.setNetworkKey = function(network,callback)
    {
        this.network = network;
        this.host.setNetworkKey(this.network.number,this.network.key,callback);
    };

    Channel.prototype.assign = function (type, extendedAssignment, callback)
    {
      this.type = type;
      this.extendedAssignment = extendedAssignment;

      this.host.assignChannel(this.channel, type.type, this.network.number, this.extendedAssignment.extendedAssignment, callback);
    };

    Channel.prototype.unassign = function (callback)
    {
      this.type = undefined;
      this.net = undefined;
      this.key = undefined;
      this.network = undefined;

      this.host.unassignChannel(this.channel,callback);
    };

    Channel.prototype.setId = function (id,callback)
    {
      this.id = id;

      this.host.setChannelId(this.channel, this.id.deviceNumber, this.id.deviceType, this.id.transmissionType,callback);
    };

    Channel.prototype.setFrequency = function (frequencyOffset,callback)
    {
      this.frequency = frequencyOffset;

      this.host.setChannelRFFreq(this.channel,frequencyOffset,callback);
    };

    Channel.prototype.setPeriod = function (period,callback)
    {
      this.period = period;

      this.host.setChannelPeriod(this.channel,period,callback);
    };

    Channel.prototype.open = function (callback)
    {
      this.host.openChannel(this.channel,callback);
    };

    Channel.prototype.close = function (callback)
    {
      this.host.closeChannel(this.channel,callback);
    };

    Channel.prototype.getStatus = function (callback)
    {
      var onStatus = function (err,status)
      {

        this.state = status.state;
        this.type = status.type;
        this.network = status.network;

        callback(err,status);

      }.bind(this);

      this.host.getChannelStatus(this.channel,onStatus);
    };

    Channel.prototype.toString = function ()
    {
      var msg ='Ch '+this.channel+' |';

      if (this.network)
        msg += this.network.toString()+'|';

      if (this.type)
        msg += this.type.toString()+'|';

      if (this.id)
       msg += this.id.toString()+'|';
    
      if (this.frequency)
      {
        msg += ' '+(2400+this.frequency)+ 'MHz'+'|';
      }

      if (this.period)
      {
        msg += ' period '+this.period+'|';
      }

      if (this.state) // Search etc.
      {
        msg += this.state.toString()+'|';
      }

      return msg;
    };

    module.export = Channel;
    return module.export;

});
