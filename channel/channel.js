/* global define: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(function(require, exports, module) {

  'use strict';

  var Logger = require('../util/logger'),
    EventEmitter = require('../util/events'),
    ChannelId = require('./channelId');

  function Channel(options, host, channel) {

    EventEmitter.call(this, options);

    if (!options)
      options = {};

    options.logSource = this;

    this.log = options.logger || new Logger(options);

    this.host = host; // Allows access to host API for channel (wrappers)

    this.channel = channel;

  }

  Channel.prototype = Object.create(EventEmitter.prototype);
  Channel.prototype.constructor = Channel;

  Channel.prototype.UNASSIGNED = 0x00;

  Channel.prototype.ASSIGNED = 0x01;

  Channel.prototype.SEARCHING = 0x02;

  Channel.prototype.TRACKING = 0x03;

  Channel.prototype.STATE = {
    0x00: 'Unassigned',
    0x01: 'Assigned',
    0x02: 'Searching',
    0x03: 'Tracking'
  };

  Channel.prototype.BIDIRECTIONAL_SLAVE = 0x00;
  Channel.prototype.BIDIRECTIONAL_MASTER = 0x10;
  Channel.prototype.SHARED_BIDIRECTIONAL_SLAVE = 0x20;
  Channel.prototype.SHARED_BIDIRECTIONAL_MASTER = 0x30;
  Channel.prototype.SLAVE_RECEIVE_ONLY = 0x40;
  Channel.prototype.MASTER_TRANSMIT_ONLY = 0x50;

  Channel.prototype.TYPE = {
    0x00: 'Bidirectional SLAVE',
    0x10: 'Bidirectional MASTER',
    0x20: 'Shared bidirectional SLAVE',
    0x30: 'Shared bidirectional MASTER',
    0x40: 'SLAVE receive only (diagnostic)',
    0x50: 'MASTER Transmit only (legacy)'
  };

  Channel.prototype.NET = {
    PUBLIC: 0x00,
    PERIOD: {
      'ENVIRONMENT': {
        LOW_POWER: 65535
      }
    },
    FREQ: {
      'ANT+': 57
    },
    KEY: {
      'ANT+': [0xB9, 0xA5, 0x21, 0xFB, 0xBD, 0x72, 0xC3, 0x45]
    }
  };

  Channel.prototype.BACKGROUND_SCANNING_ENABLE = 0x01; // 0000 0001
  Channel.prototype.FREQUENCY_AGILITY_ENABLE = 0x04; // 0000 0100
  Channel.prototype.FAST_CHANNEL_INITIATION_ENABLE = 0x10; // 0001 0000
  Channel.prototype.ASYNCHRONOUS_TRANSMISSION_ENABLE = 0x20; // 0010 0000

  Channel.prototype.getExtendedAssignment = function() {
    var msg = '',
      getStatus = function(flag, str) {
        var msg = '';
        msg += ((this.extendedAssignment & flag) !== 0) ? '+' : '-';
        msg += str;

        return msg;
      }.bind(this);

    msg += getStatus(Channel.prototype.BACKGROUND_SCANNING_ENABLE, 'Background Scanning|');
    msg += getStatus(Channel.prototype.FREQUENCY_AGILITY_ENABLE, 'Frequency Agility|');
    msg += getStatus(Channel.prototype.FAST_CHANNEL_INITIATION_ENABLE, 'Fast Channel Initiation|');
    msg += getStatus(Channel.prototype.ASYNCHRONOUS_TRANSMISSION_ENABLE, 'Asynchronous Transmission|');
    msg += this.extendedAssignment.toString(2) + 'b';

    return msg;
  };

  // Supports initialization of configuration as an object literal
  Channel.prototype.setConfiguration = function(configuration) {

    if (!configuration)
      return;

    if (configuration.type)
      this.type = configuration.type;

    if (configuration.net)
      this.net = configuration.net;

    if (configuration.key)
      this.key = configuration.key;

    if (configuration.id)
      this.id = new ChannelId(this.id.deviceNumber, this.id.deviceType, this.id.transmissionType);

    if (configuration.lowPrioritySearchTimeout)
      this.lowPrioritySearchTimeout = configuration.lowPrioritySearchTimeout;

    if (configuration.highPrioritySearchTimeout)
      this.highPrioritySearchTimeout = configuration.highPrioritySearchTimeout;

    if (configuration.extendedAssignment)
      this.extendedAssignment = configuration.extendedAssignment;
  };

  Channel.prototype.setKey = function(net, key, callback) {
    this.net = net;
    this.key = key;

    this.host.setNetworkKey(this.net, this.key, callback);
  };

  Channel.prototype.assign = function(type, net, extendedAssignment, callback) {

    this.type = type;
    this.net = net;

    if (typeof extendedAssignment === 'number') {
      this.extendedAssignment = extendedAssignment;
      this.host.assignChannel(this.channel, this.type, this.net, this.extendedAssignment, callback);

    } else if (typeof extendedAssignment === 'function') {
      this.host.assignChannel(this.channel, this.type, this.net, extendedAssignment);
    }

  };

  Channel.prototype.unassign = function(callback) {
    this.type = undefined;
    this.net = undefined;
    this.key = undefined;

    this.host.unassignChannel(this.channel, callback);
  };

  Channel.prototype.setId = function(deviceNumber, deviceType, transmissionType, callback) {
    var cb;

    if (deviceNumber instanceof ChannelId) {
      this.id = deviceNumber;
      cb = deviceType;
    } else {
      this.id = new ChannelId(deviceNumber, deviceType, transmissionType);
      cb = callback;
    }

    this.host.setChannelId(this.channel, this.id.deviceNumber, this.id.deviceType, this.id.transmissionType, cb);
  };

  Channel.prototype.getId = function(callback) {
    var onChannelId = function(err, channelId) {
      if (!err) {
        this.id = channelId;
      }

      callback(err, channelId);

    }.bind(this);

    this.host.getChannelId(this.channel, onChannelId);
  };

  Channel.prototype.setFreq = function(frequencyOffset, callback) {
    this.frequency = frequencyOffset;

    this.host.setChannelRFFreq(this.channel, frequencyOffset, callback);
  };

  Channel.prototype.setPeriod = function(period, callback) {
    this.period = period;

    this.host.setChannelPeriod(this.channel, period, callback);
  };

  Channel.prototype.open = function(callback) {
    this.host.openChannel(this.channel, callback);
  };

  Channel.prototype.openScan = function(callback) {
    this.host.openRxScanMode(this.channel, callback);
  };

  Channel.prototype.close = function(callback) {
    this.host.closeChannel(this.channel, callback);
  };

  Channel.prototype.getStatus = function(callback) {
    var key,
      onStatus = function(err, status) {

        this.state = status.state;
        this.type = status.type;
        this.net = status.net;

        callback(err, status);

      }.bind(this);

    this.host.getChannelStatus(this.channel, onStatus);
  };

  Channel.prototype.hasId = function ()
  {
    return (this.id.deviceNumber !== 0) && (this.id.deviceType !== 0) && (this.id.transmissionType !== 0);
  };

  // Data

  Channel.prototype.send = function (broadcastData,callback) {
    this.host.sendBroadcastData(this.channel,broadcastData,callback);
  };

  Channel.prototype.sendAck = function (ackData,callback) {
    this.host.sendAcknowledgedData(this.channel,ackData,callback);
  };

  Channel.prototype.sendBurst = function (burstData,callback)
  {
    console.log('BURST',burstData);
    this.host.sendBurstTransfer(this.channel,burstData,callback);
  };

  Channel.prototype.toString = function() {
    var msg = 'Ch ' + this.channel + ' |';

    if (this.network)
      msg += 'Net ' + this.net + '|';

    if (this.type)
      msg += Channel.prototype.TYPE[this.type] + '|';

    if (this.id)
      msg += this.id.toString() + '|';

    if (this.frequency) {
      msg += ' ' + (2400 + this.frequency) + 'MHz' + '|';
    }

    if (this.period) {
      msg += ' period ' + this.period + '|';
    }

    if (this.state) // Search etc.
    {
      msg += Channel.prototype.STATE[this.state] + '|';
    }

    return msg;
  };

  module.export = Channel;
  return module.export;

});
