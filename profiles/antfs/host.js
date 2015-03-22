/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var Channel = require('../../channel/channel'),
      ClientBeacon = require('./lib/layer/clientBeacon'),
      State = require('./lib/layer/util/state'),

      // Layers

      LinkManager = require('./lib/layer/linkManager'),
      AuthenticationManager = require('./lib/layer/authenticationManager'),
      TransportManager = require('./lib/layer/transportManager');

  function Host(options, host, channelNumber, net)
  {

    Channel.call(this,options, host, channelNumber, net);

    // ANT-FS Technical specification, p.44 10.2 Host Device ANT Configuration

    this.key = this.NET.KEY.ANTFS;
    this.frequency = this.NET.FREQUENCY.ANTFS;
    this.period = this.NET.PERIOD.ANTFS;
    this.lowPrioritySearchTimeout = 0xFF; // INFINITE

    this.hostName = 'antfsjs';

    this.linkManager = new LinkManager(this);

    this.authenticationManager = new AuthenticationManager(this);

    this.transportManager = new TransportManager(this);

    this.beacon =  new ClientBeacon();

    this.passkeyDB = {};

    this.on('data', this.onBroadcast);

    this.on('burst', this.onBurst);

    this.on('beacon', this.onBeacon);

    this.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset);

  }

  Host.prototype = Object.create(Channel.prototype);
  Host.prototype.constructor = Channel;

  Host.prototype.setPasskey = function (clientDeviceSerialNumber,passkey)
  {
    this.passkeyDB[clientDeviceSerialNumber] = passkey;
  };

  Host.prototype.onReset = function ()
  {

    if (this.log.logging)
      this.log.log('log','Lost contact with client. Resetting.');

    if (this.frequency !== this.NET.FREQUENCY.ANTFS)
      this.linkManager.switchFrequencyAndPeriod(this.NET.FREQUENCY.ANTFS,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, function _switchFreqPeriod(err) {
        if (err & this.log.logging)
          this.log.log('error','Failed to reset search frequency to default ANT-FS 2450 MHz');
      }.bind(this));


    this.state.set(State.prototype.LINK);

  };

  Host.prototype.connect = function (callback)
  {

    var onConnecting = function _onConnecting(err,msg)
    {

      if (!err) {
        this.state = new State(State.prototype.LINK);
        if (this.log.logging)
          this.log.log('log','Connecting, host state now '+this.state.toString());
      }
      callback(err,msg);

  }.bind(this);

    this.getSerialNumber(function _getSN(err,serialNumberMsg) {
      
      if (!err)
      {
        this.hostSerialNumber = serialNumberMsg.serialNumber;
      } else
          {
            this.hostSerialNumber = 0;
          }

      Channel.prototype.connect.call(this,onConnecting);

    }.bind(this));

  };

  Host.prototype.onBeacon = function (beacon)
  {
    if (this.log.logging)
      this.log.log('log',this.beacon.toString());
  };

  Host.prototype.onBroadcast = function (broadcast)
  {
    this.beacon.decode(broadcast.payload);

    this.emit('beacon',this.beacon);

  };

  Host.prototype.onBurst = function (burst)
  {
    this.beacon.decode(burst.subarray(0,ClientBeacon.prototype.PAYLOAD_LENGTH));

    this.emit('beacon', this.beacon);

  };

  // Take care of the situation when the client indicates that it is busy, we wait for the beacon to indicate 'not busy'
  Host.prototype.sendDelayed = function (delayedSendFunc)
  {

    var onBeacon = function _onBeacon(beacon)
    {
      if (!beacon.clientDeviceState.isBusy()) {

        if (this.log.logging)
          this.log.log('log','Sending message');

        this.removeListener('beacon',onBeacon);

        delayedSendFunc();

      } else
      {
        if (this.log.logging)
          this.log.log('log','Client is busy cannot send message right now');
      }
    }.bind(this);

    this.on('beacon',onBeacon); // Wait for next beacon (has noticed that client is busy some time after a burst is received)
  };

  Host.prototype.sendAcknowledged = function(ackData, callback, onTxCompleted, onTxFailed) {
    this.sendDelayed(Channel.prototype.sendAcknowledged.bind(this,ackData, callback, onTxCompleted, onTxFailed));
  };

  Host.prototype.sendBurst = function (burstData, packetsPerURB,callback) {
     this.sendDelayed(Channel.prototype.sendBurst.bind(this,burstData, packetsPerURB,callback));
  };

  module.exports = Host;
  return module.exports;
});
