/* global define: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function (require,exports,module){

  'use strict';

  var Logger = require('../util/logger'),
      EventEmitter = require('../util/events'),
      Network = require('./network'),
      ChannelId = require('./channelId'),
      ChannelState = require('./channelState'),
      ChannelType = require('./channelType'),
      LowPrioritySearchTimeout = require('./LowPrioritySearchTimeout'),
      HighPrioritySearchTimeout = require('./HighPrioritySearchTimeout'),
      ExtendedAssignment = require('./extendedAssignment');

    function Channel(options,host,channel)    {

        EventEmitter.call(this,options);

        if (!options)
            options = {};

        options.logSource = this;

        this.log = options.logger || new Logger(options);

        this.host = host; // Allows access to host API for channel (wrappers)

        this.channel = channel;
        this.network = new Network(Network.prototype.PUBLIC);

    }

    Channel.prototype = Object.create(EventEmitter.prototype);
    Channel.prototype.constructor = Channel;

    // Supports initialization of configuration as an object literal
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

    Channel.prototype.setNetwork = function (number)
    {
      this.network.number = number;
    };

    Channel.prototype.setNetworkKey = function(number,key,callback)

    {
      var cb = callback;

      if (number instanceof Network)
      {
        this.network = network;
        cb = key;
      }

      else
        this.network = new Network(number,key);

        this.host.setNetworkKey(this.network.number,this.network.key,cb);
    };

    Channel.prototype.assign = function (type, extendedAssignment, callback)
    {

      if (type instanceof ChannelType)
        this.type = type;
      else
        this.type = new ChannelType(type);

      if (extendedAssignment instanceof ExtendedAssignment)
      {
        this.extendedAssignment = extendedAssignment;
        this.host.assignChannel(this.channel, this.type.type, this.network.number, this.extendedAssignment.extendedAssignment, callback);

      }
      else if (typeof extendedAssignment === 'function')
      {
        this.host.assignChannel(this.channel, this.type.type, this.network.number, extendedAssignment);
      }

      else {
        this.extendedAssignment = new ExtendedAssignment(extendedAssignment);
        this.host.assignChannel(this.channel, this.type.type, this.network.number, this.extendedAssignment.extendedAssignment, callback);

      }
    };

    Channel.prototype.unassign = function (callback)
    {
      this.type = undefined;
      this.net = undefined;
      this.key = undefined;
      this.network = undefined;

      this.host.unassignChannel(this.channel,callback);
    };

    Channel.prototype.setId = function (deviceNumber,deviceType,transmissionType,callback)
    {
      var cb;

      if (deviceNumber instanceof ChannelId)
      {
        this.id = deviceNumber;
        cb = deviceType;
      } else
       {
         this.id = new ChannelId(deviceNumber,deviceType,transmissionType);
         cb = callback;
       }

      this.host.setChannelId(this.channel, this.id.deviceNumber, this.id.deviceType, this.id.transmissionType,cb);
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
      var key,
          onStatus = function (err,status)
                    {

                      this.state = status.state;
                      this.type = status.type;

                      if (this.network instanceof Network)
                         this.network.number = status.networkNumber;
                      else
                        this.network = new Network(status.networkNumber);

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
