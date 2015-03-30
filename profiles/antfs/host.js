/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

'use strict';

var Channel = require('../../channel/channel'),
  ClientBeacon = require('./lib/layer/clientBeacon'),
  State = require('./lib/layer/util/state'),

  // Layers

  LinkManager = require('./lib/layer/linkManager'),
  AuthenticationManager = require('./lib/layer/authenticationManager'),
  TransportManager = require('./lib/layer/transportManager');

function Host(options, host, channelNumber, net) {

  Channel.call(this, options, host, channelNumber, net);

  // ANT-FS Technical specification, p.44 10.2 Host Device ANT Configuration

  this.key = this.NET.KEY.ANTFS;
  this.frequency = this.NET.FREQUENCY.ANTFS;
  this.period = this.NET.PERIOD.ANTFS;
  this.lowPrioritySearchTimeout = 0xFF; // INFINITE

  this.hostname = 'antfsjs';

  this.on('data', this.onBroadcast); // decodes client beacon

  this.on('burst', this.onBurst); // decodes client beacon

  this.on('beacon', this.onBeacon);

  this.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));

  // Initialize layer specific event handlers at the tail of event callbacks
  // Host has priority (in front of event callbacks) because it handles decoding of the client beacon

  this.linkManager = new LinkManager(this);

  this.authenticationManager = new AuthenticationManager(this);

  this.transportManager = new TransportManager(this);
  this.transportManager.on('download_progress', this.onDownloadProgress.bind(this));
  this.transportManager.on('download', this.onDownload.bind(this));


  this.beacon = new ClientBeacon();

}

Host.prototype = Object.create(Channel.prototype);
Host.prototype.constructor = Channel;

Host.prototype.onDownloadProgress = function (err, session)
{
  this.emit('download_progress',err,session);
};

Host.prototype.onDownload = function (err, session)
{
  this.emit('download',err,session);
};

Host.prototype.setPasskey = function(clientDeviceSerialNumber, passkey) {
  this.autenticationManager.pairingDB[clientDeviceSerialNumber] = passkey;
};

Host.prototype.getHostname = function() {
  return this.hostname;
};

Host.prototype.getClientSerialNumber = function ()
{
  return this.authenticationManager.clientSerialNumber;
};

Host.prototype.onRxFailGoToSearch = function() {
  this.log.log('log', 'Lost contact with client. Resetting.');
  this.onReset();
};

Host.prototype.onReset = function(err, callback) {

  if (this.frequency !== this.NET.FREQUENCY.ANTFS)
    this.linkManager.switchFrequencyAndPeriod(this.NET.FREQUENCY.ANTFS, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, function _switchFreqPeriod(e) {

      if (e & this.log.logging)
        this.log.log('error', 'Failed to reset search frequency to default ANT-FS 2450 MHz');

      if (typeof callback === 'function')
        callback(e);
    }.bind(this));

};

Host.prototype.connect = function(callback) {

  var onConnecting = function _onConnecting(err, msg) {

    if (!err) {
      this.state = new State(State.prototype.LINK);
      if (this.log.logging)
        this.log.log('log', 'Connecting, host state now ' + this.state.toString());
    }
    callback(err, msg);

  }.bind(this);

  this.getSerialNumber(function _getSN(err, serialNumberMsg) {

    if (!err) {
      this.setHostSerialNumber(serialNumberMsg.serialNumber);
    } else {
      this.setHostSerialNumber(0);
    }

    Channel.prototype.connect.call(this, onConnecting);

  }.bind(this));

};

Host.prototype.setHostSerialNumber = function(serialNumber) {
  this.hostSerialNumber = serialNumber;
};

Host.prototype.getHostSerialNumber = function() {
  return this.hostSerialNumber;
};

Host.prototype.onBeacon = function(beacon) {
  if (this.log.logging)
    this.log.log('log', this.beacon.toString());
};

Host.prototype.onBroadcast = function(broadcast) {
  var res = this.beacon.decode(broadcast.payload);


  if (res === -1)

  {
    if (this.log.logging) {
      this.log.log('log', 'Broadcast not a valid beacon. Ignoring.');
    }
  } else {

    this.emit('beacon', this.beacon);
  }

};

Host.prototype.onBurst = function(burst) {
  var res = this.beacon.decode(burst.subarray(0, ClientBeacon.prototype.PAYLOAD_LENGTH));
  if (res === -1)

  {
    if (this.log.logging) {
      this.log.log('warn', 'Expected client beacon as the first packet of the burst');
    }
  } else {

    this.emit('beacon', this.beacon);

  }

};

Host.prototype._sendDelayed = function(command, delayedSendFunc) {

  // Spec. 9.4 "The busy state is not cleared from the client beacon until after the appropiate response has been sent"

  var onBeacon = function _onBeacon(beacon) {

      if (!beacon.clientDeviceState.isBusy()) {

        if (this.log.logging)
          this.log.log('log', 'Delayed sending ' + command.toString() + ' client ' +
            this.beacon.clientDeviceState.toString());

        sendCommand();
      } else {
        if (this.log.logging)
          this.log.log('log', 'Client still busy, waiting to send delayed message');
      }

    }.bind(this),

    sendCommand = function _sendCommand() {

      this.removeListener('beacon', onBeacon);

      delayedSendFunc();

    }.bind(this);

  // Spec 9.4 "The host shall not send a command to the client while the beacon indicates it is in the busy state"

  if (!this.beacon.clientDeviceState.isBusy()) {
    if (this.log.logging)
      this.log.log('log', 'Sending ' + command.toString() + ' client ' +
        this.beacon.clientDeviceState.toString());

    sendCommand(); // Try sending immediatly

  } else {
    if (this.log.logging)
      this.log.log('log', 'Client is busy, delaying message.');

    this.on('beacon', onBeacon); // Wait for next beacon
  }
};

// Override
Host.prototype.sendAcknowledged = function(command, callback) {
  this._sendDelayed(command, Channel.prototype.sendAcknowledged.bind(this, command.serialize(), callback));
};

// Override
Host.prototype.sendBurst = function(command, packetsPerURB, callback) {
  this._sendDelayed(command, Channel.prototype.sendBurst.bind(this, command.serialize(), packetsPerURB, callback));
};

module.exports = Host;
return module.exports;
