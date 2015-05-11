/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

/*jshint -W097 */
'use strict';

var Channel = require('../../channel/channel'),
    ChannelResponseEvent = require('../../channel/channelResponseEvent'),
  ClientBeacon = require('./lib/layer/clientBeacon'),
  State = require('./lib/layer/util/state'),

  // Layers

  LinkManager = require('./lib/layer/linkManager'),
  AuthenticationManager = require('./lib/layer/authenticationManager'),
  TransportManager = require('./lib/layer/transportManager'),

  AuthenticateRequest = require('./lib/request-response/authenticateRequest'),
  DownloadRequest  = require('./lib/request-response/downloadRequest'),
  EraseRequest = require('./lib/request-response/eraseRequest');

function Host(options, ANTHost, channel, net, deviceNumber, hostname, download, erase,ls, skipNewFiles, ignoreBusyState) {

  Channel.call(this, options, ANTHost, channel, net);

  // ANT-FS Technical specification, p.44 10.2 Host Device ANT Configuration

  this.key = this.NET.KEY.ANTFS;
  this.frequency = this.NET.FREQUENCY.ANTFS;
  this.period = this.NET.PERIOD.ANTFS;
  this.lowPrioritySearchTimeout = 0xFF; // INFINITE

  if (typeof deviceNumber === 'number') // Search for specific device
   this.setId(deviceNumber,0,0);

  if (typeof hostname === 'string')
   this.hostname = hostname;
  else
   this.hostname = 'antfsjs';

  if (this.log.logging)
    this.log.log('log','Hostname ' + this.hostname);

  this.on('data', this.onBroadcast.bind(this)); // decodes client beacon

  this.on('burst', this.onBurst.bind(this)); // decodes client beacon - 1 packet of burst

  this.on('beacon', this.onBeacon.bind(this));


  this.on('reset', this.onReset.bind(this));


  this.on('directory', function _onDirectory(lsl) {
    /*jshint -W117 */
   if (ls)
      console.log(lsl);
  });

  // Initialize layer specific event handlers at the tail of event callbacks
  // Host has priority (in front of event callbacks) because it handles decoding of the client beacon

  this.linkManager = new LinkManager(this);

  this.authenticationManager = new AuthenticationManager(this);

  this.transportManager = new TransportManager(this, download, erase, ls, skipNewFiles);

  this.beacon = new ClientBeacon();

  this.on('EVENT_TRANSFER_TX_FAILED', this.sendNow);
  this.on('EVENT_TRANSFER_RX_FAILED', this.sendNow);
  this.on('EVENT_TRANSFER_TX_COMPLETED', this.onTxCompleted);
  this.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onRxFailGoToSearch);

  this.option.ignoreBusyState = ignoreBusyState;

  this.session = {};

}

Host.prototype = Object.create(Channel.prototype);
Host.prototype.constructor = Channel;

Host.prototype.onRxFailGoToSearch = function (e,m)
{
  clearTimeout(this.session.burstResponseTimeout);
  this.once('HOST_CHANNEL_OPEN', this.sendNow.bind(this,e,m)); // Queue on next beacon
};

Host.prototype.onBeacon = function(beacon) {
  var NO_ERROR,
      BEACON_TIMEOUT = 25000;

  clearTimeout(this.beaconTimeout);

  this.beaconTimeout = setTimeout(function _beaconTimeout ()
  {

    if (this.log.logging)
      this.log.log('log','Client beacon timeout ' + BEACON_TIMEOUT + ' ms');

    this.emit('reset');
  }.bind(this), BEACON_TIMEOUT);

  if (this.log.logging)
    this.log.log('log', this.beacon.toString());

  // Client dropped to link
  if (!this.layerState.isLink() && this.beacon.clientDeviceState.isLink())
  {
    if (this.log.logging)
      this.log.log('log','Client dropped to LINK, Host ',this.layerState.toString(),'Client',this.beacon.clientDeviceState.toString());

    this.emit('reset');
  }
  else if (!this.beacon.clientDeviceState.isBusy()) {
    this.emit('CLIENT_NOT_BUSY'); // in case of pending transfer due to busy state
    this.emit('HOST_CHANNEL_OPEN'); // in case channel RX_FAIL_GOTO_SEARCH
  }
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

  clearTimeout(this.session.burstResponseTimeout);

  this.session.response = burst;

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

Host.prototype.onTxCompleted = function ()
{
  var BURST_RESPONSE_TIMEOUT = this.period / 32768 * 1000 * 8,
      NO_ERROR;

  if (this.session.hasBurstResponse && !(this.session.request instanceof AuthenticateRequest &&
        this.session.request.commandType === AuthenticateRequest.prototype.REQUEST_PAIRING))
  {
    // It's possible that a request is sent, but no burst response is received. In that case, the request must be retried.
    // During pairing, user intervention is necessary, so don't enable timeout

       this.session.burstResponseTimeout =  setTimeout(this.sendNow.bind(this, NO_ERROR, 'Client burst response timeout ' + BURST_RESPONSE_TIMEOUT + ' ms'),
                                                     BURST_RESPONSE_TIMEOUT);

     if (this.log.logging)
       this.log.log('log', 'Burst response timeout in ' + BURST_RESPONSE_TIMEOUT +' ms');
     }
};

Host.prototype.getHostname = function() {
  return this.hostname;
};

Host.prototype.getClientSerialNumber = function() {
  return this.authenticationManager.clientSerialNumber;
};

Host.prototype.getClientFriendlyname = function() {
  return this.authenticationManager.clientFriendlyname;
};

Host.prototype.onReset = function(err, callback) {

  clearTimeout(this.beaconTimeout);
  clearTimeout(this.session.burstResponseTimeout);
  this.removeAllListeners('CLIENT_NOT_BUSY');
  this.removeAllListeners('HOST_CHANNEL_OPEN');
  this.session = {};

};

Host.prototype.connect = function(callback) {

  var onConnecting = function _onConnecting(err, msg) {

    if (!err) {
      this.layerState = new State(State.prototype.LINK);
      if (this.log.logging)
        this.log.log('log', 'Connecting, host state now ' + this.layerState.toString());
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

Host.prototype.initRequest = function (request, callback)
{
  var NO_ERROR,
      serializedRequest = request.serialize();

  this.session = {};

  this.session.request = request;

  // Spec 12.2 "If a client responds with one of the ANT-FS response messages listed below,
  // this response will be appended to the beacon and sent as a burst transfer" -> there
  // is a possibility of failed receive of burst (EVENT_TRANSFER_RX_FAILED)

  this.session.hasBurstResponse = [0x04,0x09,0x0A,0x0B,0x0C].indexOf(request.ID) !== -1;

  this.session.retry = -1;

  if (serializedRequest.length <= 8)
   this.session.sendFunc = Channel.prototype.sendAcknowledged.bind(this, serializedRequest, callback);
  else
   this.session.sendFunc = Channel.prototype.sendBurst.bind(this, serializedRequest, callback);


  this.sendRequest(NO_ERROR,request);
};

Host.prototype.sendNow = function (e,m)
{
  var MAX_RETRIES = 15,
      err;

  if (!this.isTracking()) // in case RX_FAIL_GOTO_SEARCH
    return;

  clearTimeout(this.session.burstResponseTimeout);

  if (++this.session.retry <= MAX_RETRIES)
  {

    if (this.log.logging)
      this.log.log('log','Sending request, retry '  + this.session.retry +' ' + m.toString());

    this.session.sendFunc(); // Acknowleded or burst setup in initRequest

  }
  else
  {

    err = new Error('Max retries ' + MAX_RETRIES + ' reached for request ' + this.session.request.toString());

    if (this.session.request instanceof DownloadRequest)

      this.emit('download', err);

    else if (this.session.request instanceof EraseRequest)

      this.emit('erase',err);
  }
};


Host.prototype.sendRequest = function (e,m)
{

  //if (this.isTransferInProgress() || !this.isTracking()) // Channel can drop to search state (RX_FAIL_GOTO_SEARCH), we have to check for tracking
  //  return;

  if (this.beacon.clientDeviceState.isBusy() && !this.option.ignoreBusyState)
  {
    if (this.log.logging)
      this.log.log('log','Client is busy, cannot send request now', this.session);

    this.once('CLIENT_NOT_BUSY',this.sendNow.bind(this,e,m)); // Queue pending transfer on next beacon (onBeacon) when client is not busy
  }
  else
    this.sendNow(e,m);

};

// Override Channel
Host.prototype.sendAcknowledged = function(request, callback) {
  this.initRequest(request, callback);
};

// Override Channel
Host.prototype.sendBurst = function(request, callback) {
  this.initRequest(request,callback);
};

Host.prototype.disconnect = function (callback)
{
var onDisconnect = function _onDisconnect(e,m)
  {
    this.removeAllListeners('beacon');

    this.emit('reset');

    if (typeof callback === 'function') {
      callback.call(this,arguments);
    }
  }.bind(this);


  this.linkManager.disconnect(onDisconnect);
};

module.exports = Host;
