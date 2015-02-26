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

    function Channel(options,host,configuration)    {

        EventEmitter.call(this,options);

        if (!options)
            options = {};

        options.logSource = this;

        this.log = options.logger || new Logger(options);

        this.host = options.host; // Allows access to host API for channel object (wrappers)

        this._setConfiguration(configuration);

    }

    Channel.prototype = Object.create(EventEmitter.prototype);
    Channel.prototype.constructor = Channel;

    Channel.prototype._setConfiguration = function(configuration)
    {
      var parameters = {
        channel : undefined,
        type : undefined,
        net : undefined,
        key : undefined,
        deviceNumber : undefined,
        deviceType : undefined,
        transmissionType : undefined,
        frequency : undefined,
        period : undefined,
        lowPrioritySearchTimeout : undefined,
        highPrioritySearchTimeout : undefined,
        extendedAssignment : undefined,
      };

      if (!configuration)
        configuration = {};

      Object.keys(parameters).forEach(function (value,index,arr){ this[value] = configuration[value]; },this);

      this.network = new Network(this.net,this.key);

      this.type = new ChannelType(this.type);

      this.id = new ChannelId(this.deviceNumber,this.deviceType,this.transmissionType);

      if (this.lowPrioritySearchTimeout)
        this.lowPrioritySearchTimeout = new LowPrioritySearchTimeout(this.lowPrioritySearchTimeout);

      if (this.highPrioritySearchTimeout)
        this.highPrioritySearchTimeout = new HighPrioritySearchTimeout(this.highPrioritySearchTimeout);

      if (this.extendedAssignment)
        this.extendedAssignment = new ExtendedAssignment(this.extendedAssignment);
    };

    // Tried to make API somewhat similar to Dynastream ANT Android SDK for channel
    // file:///ANT_Android_SDK/com/dsi/ant/channel/AntChannel.html

    Channel.prototype.setNetworkKey = function(net,key,callback)
    {
       this.network.net = net;
       this.network.key = key;
        this.host.setNetworkKey(net,key,callback);
    };

    Channel.prototype.assign = function (channelType, extendedAssignment, callback)
    {
      this.type = channelType;
      this.extendedAssignment = extendedAssignment;

      this.host.assignChannel(this.channel, channelType.type, this.network.number, this.extendedAssignment, callback);
    };

    Channel.prototype.unassign = function (callback)
    {
      this.type = undefined;
      this.net = undefined;
      this.key = undefined;
      this.network = undefined;

      this.host.unassignChannel(this.channel,callback);
    };

    Channel.prototype.setChannelId = function (channelId,callback)
    {
      this.id = channelId;
      this.deviceNumber = this.id.deviceNumber;
      this.deviceType = this.id.deviceType;
      this.transmissionType = this.id.transmissionType;

      this.host.setChannelId(this.channel, channelId.deviceNumber, channelId.deviceType, channelId.transmissionType,callback);
    };

    Channel.prototype.setRfFrequency = function (frequencyOffset,callback)
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

    module.export = Channel;
    return module.export;

});
