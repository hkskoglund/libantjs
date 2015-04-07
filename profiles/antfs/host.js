/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

/*jshint -W097 */
'use strict';

var Channel = require('../../channel/channel'),
  ClientBeacon = require('./lib/layer/clientBeacon'),
  State = require('./lib/layer/util/state'),

  // Layers

  LinkManager = require('./lib/layer/linkManager'),
  AuthenticationManager = require('./lib/layer/authenticationManager'),
  TransportManager = require('./lib/layer/transportManager');

function Host(options, host, channel, net, deviceNumber) {

  Channel.call(this, options, host, channel, net);

  // ANT-FS Technical specification, p.44 10.2 Host Device ANT Configuration

  this.key = this.NET.KEY.ANTFS;
  this.frequency = this.NET.FREQUENCY.ANTFS;
  this.period = this.NET.PERIOD.ANTFS;
  this.lowPrioritySearchTimeout = 0xFF; // INFINITE

  if (typeof deviceNumber === 'number') // Search for specific device
   this.setId(deviceNumber,0,0);

  this.hostname = 'antfsjs';

  this.on('data', this.onBroadcast); // decodes client beacon

  this.on('burst', this.onBurst); // decodes client beacon

  this.on('beacon', this.onBeacon);

  this.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));

  this.on('directory', function _onDirectory(lsl) {
    console.log(lsl);
  });

  // Initialize layer specific event handlers at the tail of event callbacks
  // Host has priority (in front of event callbacks) because it handles decoding of the client beacon

  this.linkManager = new LinkManager(this);

  this.authenticationManager = new AuthenticationManager(this);

  this.transportManager = new TransportManager(this);

  this.beacon = new ClientBeacon();

}

Host.prototype = Object.create(Channel.prototype);
Host.prototype.constructor = Channel;

Host.prototype.getHostname = function() {
  return this.hostname;
};

Host.prototype.getClientSerialNumber = function() {
  return this.authenticationManager.clientSerialNumber;
};

Host.prototype.getClientFriendlyname = function() {
  return this.authenticationManager.clientFriendlyname;
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

  if (!this.beacon.clientDeviceState.isBusy())
    this.emit('delayedsend'); // In case requests could not be sent when client was busy
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

  clearTimeout(this.burstResponseTimeout);

  if (this.boundOnTransferRxFailed)
    this.host.removeListener('EVENT_TRANSFER_RX_FAILED', this.boundOnTransferRxFailed);

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

Host.prototype._sendDelayed = function(request, boundSendFunc) {

  // Spec. 9.4 "The busy state is not cleared from the client beacon until after the appropiate response has been sent"

  // Spec 9.4 "The host shall not send a request to the client while the beacon indicates it is in the busy state"

  var sendRequest = function _sendRequest()
  {

    if (this.log.logging) {

      this.log.log('log', 'Sending ' + request.toString() + ' client state ' + this.beacon.clientDeviceState.toString());

    }

    // Spec 12.2 "If a client responds with one of the ANT-FS response messages listed below,
    // this response will be appended to the beacon and sent as a burst transfer"

    if ([0x04,0x09,0x0A,0x0B,0x0C].indexOf(request.ID) !== -1)
    {

      // It's possible that a request is sent, but no burst response is received. In that case, the request must be retried.

      this.burstResponseTimeout = setTimeout(this._sendDelayed.bind(this, request, boundSendFunc), 1000);

      this.boundOnTransferRxFailed = this._sendDelayed.bind(this, request, boundSendFunc);

      this.host.once('EVENT_TRANSFER_RX_FAILED', this.boundOnTransferRxFailed);

    } else
       delete this.burstResponseTimeout;

    boundSendFunc();

  }.bind(this);

  if (!this.beacon.clientDeviceState.isBusy()) {

    sendRequest();

  } else {

    if (this.log.logging)
      this.log.log('log', 'Client is busy, delaying message.');

    this.once('delayedsend', sendRequest); // Wait for next beacon and client not busy
  }

};

// Override Channel
Host.prototype.sendAcknowledged = function(request, callback) {
  this._sendDelayed(request, Channel.prototype.sendAcknowledged.bind(this, request.serialize(), callback));

};

// Override Channel
Host.prototype.sendBurst = function(request, packetsPerURB, callback) {
  this._sendDelayed(request, Channel.prototype.sendBurst.bind(this, request.serialize(), packetsPerURB, callback));

};

module.exports = Host;
return module.exports;
