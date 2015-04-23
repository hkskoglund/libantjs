/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Logger = require('../util/logger'),
    EventEmitter = require('events'),
    ChannelId = require('./channelId');

  function Channel(options, host, channelNumber, net, type) {

    EventEmitter.call(this, options);

    if (!options)
      options = {};

    options.logSource = this;

    this.option = options;

    this.log = options.logger || new Logger(options);

    this.host = host; // Allows access to host API for channel (wrappers)

    this.channel = channelNumber;

    this.net = net || 0;

    this.key = this.NET.KEY.PUBLIC;

    this.type = type || this.BIDIRECTIONAL_SLAVE;

    this.id = this.getWildcardId();

    this.frequency = this.NET.FREQUENCY.DEFAULT;

    this.period = this.NET.PERIOD.DEFAULT;

    this.burst = undefined; // Contains aggregated burst data

    this.on('EVENT_TRANSFER_TX_COMPLETED', Channel.prototype.onTxCompleted);
    this.on('EVENT_TRANSFER_TX_FAILED', Channel.prototype.onTxFailed);
    this.on('EVENT_RX_FAIL_GO_TO_SEARCH', Channel.prototype.onRxFailGoToSearch);
    this.on('data', Channel.prototype.onBroadcast);
    this.on('burst', Channel.prototype.onBurst);

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
    PERIOD: {
      DEFAULT : 8192,  // 4 Hz
      ANTFS : 4096,    // 8 Hz
      'ENVIRONMENT': {
        LOW_POWER: 65535  // 0.5 Hz
      }
    },
    FREQUENCY: {
      DEFAULT : 66, // 2466 MHz
      'ANT+': 57,
      ANTFS : 50,
    },
    KEY: {
      PUBLIC  : [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Default
      'ANT+'  : [0xB9, 0xA5, 0x21, 0xFB, 0xBD, 0x72, 0xC3, 0x45],
      ANTFS   : [0xa8, 0xa4, 0x23, 0xb9, 0xf5, 0x5e, 0x63, 0xc1]
    }
  };

  Channel.prototype.EVENT = {
    BURST: 'burst' // Total burst, i.e all burst packets
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

  Channel.prototype.MAX_RF = 124;

  Channel.prototype.onBurst = function (burst)
  {
     this.state = this.TRACKING;
  };

  Channel.prototype.onBroadcast = function (broadcast)
  {
     this.state = this.TRACKING;
  };

  Channel.prototype.onRxFailGoToSearch = function() {

    this.state = this.SEARCHING;

    if (this.log.logging)
       this.log.log('log', 'Lost contact with client, searching.');

  };



  Channel.prototype.onTxCompleted = function (e,m)
  {
    this.transferInProgress = false;
  };

  Channel.prototype.onTxFailed = function (e,m)
  {
    this.transferInProgress = false;
  };

  Channel.prototype.isTransferInProgress = function ()
  {
    return this.transferInProgress;
  };

  Channel.prototype.isTracking = function ()
  {
    return this.state === this.TRACKING;
  };

  Channel.prototype.getWildcardId = function ()
  {
    return new ChannelId(0,0,0);
  };

  Channel.prototype.getSerialNumber = function (callback)
  {
    this.host.getSerialNumber(callback);
  };

  Channel.prototype.connect = function (callback)
  {
    var onSetNetworkKey = function _onSetNetworkKey (err,msg) {
                            if (!err)
                              this.slave(onAssigned);
                            else
                              callback(err);
                          }.bind(this),

    onAssigned = function _onAssigned (err,msg) {
                  if (!err)
                    this.setId(this.id,onSetId);
                  else
                    callback(err);
                }.bind(this),

    onSetId = function _onSetId (err,msg) {
                if (!err)
                  this.setFrequency(this.frequency,onSetFreq);
                else
                  callback(err);
              }.bind(this),

    onSetFreq = function _onSetFreq (err,msg) {
                  if (!err)
                    this.setPeriod(this.period,onSetPeriod);
                  else
                    callback(err);
                }.bind(this),

    onSetPeriod = function _onSetPeriod (err,msg) {
                   if (!err)
                    this.setLowPriorityTimeout(this.lowPrioritySearchTimeout,onSetLowPriorityTimeout);
                  else
                    callback(err);
                }.bind(this),

    onSetLowPriorityTimeout = function _onSetLowPriorityTimeout (err,msg) {
                                 if (!err)
                                  this.open(callback);
                                else
                                  callback(err);
                              }.bind(this);

    this.setNetworkKey(this.key,onSetNetworkKey);

  };

  Channel.prototype.setNetworkKey = function(key, callback) {
    this.key = key;

    this.host.setNetworkKey(this.net, this.key, callback);

  };

  Channel.prototype.slave = function (callback)
  {
    this.assign(this.BIDIRECTIONAL_SLAVE, this.net, callback);
  };

  Channel.prototype.slaveOnly = function (callback)
  {
    this.assign(this.SLAVE_RECEIVE_ONLY, this.net, callback);
  };

  Channel.prototype.master = function (callback)
  {
    this.assign(this.BIDIRECTIONAL_MASTER, this.net, callback);
  };

  Channel.prototype.masterOnly = function (callback)
  {
    this.assign(this.MASTER_TRANSMIT_ONLY, this.net, callback);
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

    if (cb) // Just update state if no callback is provide
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

  Channel.prototype.setFrequency = function(frequencyOffset, callback) {
    this.frequency = frequencyOffset;

    this.host.setChannelRFFreq(this.channel, frequencyOffset, callback);
  };

  Channel.prototype.setPeriod = function(period, callback) {
    this.period = period;

    this.host.setChannelPeriod(this.channel, period, callback);
  };

  Channel.prototype.setLowPriorityTimeout = function (timeout,callback)
  {
    this.lowPrioritySearchTimeout = timeout;
    this.host.setLowPriorityChannelSearchTimeout(this.channel, this.lowPrioritySearchTimeout, callback);
  };

  Channel.prototype.open = function(callback) {

    var cb = function _openCB (e,m)
    {
        if (!e)
         this.host.emit('open', this.channel);

        callback.apply(this,arguments);

    }.bind(this);

    this.host.openChannel(this.channel, cb);
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

  Channel.prototype.hasId = function() {
    return (this.id.deviceNumber !== 0) && (this.id.deviceType !== 0) && (this.id.transmissionType !== 0);
  };

  // Data

  Channel.prototype.send = function(broadcastData, callback) {
    this.host.sendBroadcastData(this.channel, broadcastData, callback);
  };

  Channel.prototype.sendAcknowledged = function(ackData, callback) {
    var cb = function _sendAcknowledgedCB(e,m) {
      if (e)
        this.transferInProgress = false;
      callback(e,m);
    }.bind(this);

    this.transferInProgress = true;

    this.host.sendAcknowledgedData(this.channel, ackData, cb);
  };

  Channel.prototype.sendBurst = function(burstData, packetsPerURB,callback) {
    var cb = function _sendBurstCB(e,m) {
      if (e)
        this.transferInProgress = false;
      callback(e,m);
    }.bind(this);

    if (typeof packetsPerURB === 'function') {
      callback = packetsPerURB;
      packetsPerURB = 1;
    }

    this.transferInProgress = true;

    this.host.sendBurstTransfer(this.channel, burstData, packetsPerURB,cb);
  };

  Channel.prototype.toString = function() {
    var msg = 'Ch ' + this.channel + ' |';

    if (this.net)
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

  module.exports = Channel;
  return module.exports;
