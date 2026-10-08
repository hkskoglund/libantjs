'use strict';

var Channel = require('../../channel/channel'),
  ClientBeacon = require('./lib/layer/clientBeacon'),
  State = require('./lib/layer/util/state'),

  // Layers

  LinkManager = require('./lib/layer/linkManager'),
  AuthenticationManager = require('./lib/layer/authenticationManager'),
  TransportManager = require('./lib/layer/transportManager'),

  AuthenticateRequest = require('./lib/request-response/authenticateRequest'),
  DownloadRequest  = require('./lib/request-response/downloadRequest'),
  EraseRequest = require('./lib/request-response/eraseRequest'),
  UploadRequest = require('./lib/request-response/uploadRequest'),
  UploadDataRequest = require('./lib/request-response/uploadDataRequest');

function ANTFSHostChannel(options, ANTHost, channel) {
  options = options || {};

  Channel.call(this, options, ANTHost, channel, options.net);

  // ANT-FS Technical specification, p.44 10.2 Host Device ANT Configuration

  this.key = this.NET.KEY.ANTFS;
  this.frequency = this.NET.FREQUENCY.ANTFS;
  this.period = this.NET.PERIOD.ANTFS;
  this.lowPrioritySearchTimeout = 0xFF; // INFINITE

  if (typeof options.deviceNumber === 'number') // Search for specific device
   this.setId(options.deviceNumber,0,0);

  if (typeof options.hostname === 'string')
   this.hostname = options.hostname;
  else
   this.hostname = 'antfsjs';

  if (this.log.logging)
    this.log.debug('Hostname ' + this.hostname);

  this.on('data', this.onBroadcast.bind(this)); // decodes client beacon

  this.on('burst', this.onBurst.bind(this)); // decodes client beacon - 1 packet of burst

  this.on('beacon', this.onBeacon.bind(this));


  this.on('reset', this.onReset.bind(this));


  this.on('directory', function _onDirectory(lsl) {

   if (options.ls)
      this.log.console.log(lsl);
  }.bind(this));

  // Initialize layer specific event handlers at the tail of event callbacks
  // Host has priority (in front of event callbacks) because it handles decoding of the client beacon

  this.linkManager = new LinkManager(this);

  this.authenticationManager = new AuthenticationManager(this);

  this.transportManager = new TransportManager(
    this,
    options.download,
    options.erase,
    options.ls,
    options.skipNewFiles
  );

  this.beacon = new ClientBeacon();

  this.on('EVENT_TRANSFER_TX_FAILED', this.sendNow);
  this.on('EVENT_TRANSFER_RX_FAILED', this.sendNow);
  this.on('EVENT_TRANSFER_TX_COMPLETED', this.onTxCompleted);
  this.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onRxFailGoToSearch);

  this.option.ignoreBusyState = options.ignoreBusyState;

  this.session = {};

}

ANTFSHostChannel.prototype = Object.create(Channel.prototype);
ANTFSHostChannel.prototype.constructor = ANTFSHostChannel;

ANTFSHostChannel.prototype.onRxFailGoToSearch = function (e,m)
{
  clearTimeout(this.session.burstResponseTimeout);
  this.once('HOST_CHANNEL_OPEN', this.sendNow.bind(this,e,m)); // Queue on next beacon
};

ANTFSHostChannel.prototype.onBeacon = function(beacon) {
  var BEACON_TIMEOUT = 25000;

  clearTimeout(this.beaconTimeout);

  this.beaconTimeout = setTimeout(function _beaconTimeout ()
  {

    if (this.log.logging)
      this.log.debug('Client beacon timeout ' + BEACON_TIMEOUT + ' ms');

    this.emit('reset');
  }.bind(this), BEACON_TIMEOUT);

  if (this.log.logging)
    this.log.debug( this.beacon.toString());

  // Client dropped to link
  if (!this.layerState.isLink() && this.beacon.clientDeviceState.isLink())
  {
    if (this.log.logging)
      this.log.debug('Client dropped to LINK, Host ',this.layerState.toString(),'Client',this.beacon.clientDeviceState.toString());

    this.emit('reset');
  }
  else if (!this.beacon.clientDeviceState.isBusy()) {
    this.emit('CLIENT_NOT_BUSY'); // in case of pending transfer due to busy state
    this.emit('HOST_CHANNEL_OPEN'); // in case channel RX_FAIL_GOTO_SEARCH
  }
};

ANTFSHostChannel.prototype.onBroadcast = function(broadcast) {

  var res = this.beacon.decode(broadcast.payload);

  if (res === -1)

  {
    if (this.log.logging) {
      this.log.debug( 'Broadcast not a valid beacon. Ignoring.');
    }
  } else {

    this.emit('beacon', this.beacon);
  }

};

ANTFSHostChannel.prototype.onBurst = function(burst) {

  clearTimeout(this.session.burstResponseTimeout);

  this.session.response = burst;

  var res = this.beacon.decode(burst.subarray(0, ClientBeacon.prototype.PAYLOAD_LENGTH));

  if (res === -1)

  {
    if (this.log.logging) {
      this.log.warn( 'Expected client beacon as the first packet of the burst');
    }
  } else {

    this.emit('beacon', this.beacon);

  }

};

ANTFSHostChannel.prototype.onTxCompleted = function ()
{
  var BURST_RESPONSE_TIMEOUT = this.period / 32768 * 1000 * 8,
      NO_ERROR;

  if (this.closed)
    return;

  if (this.session.hasBurstResponse && !(this.session.request instanceof AuthenticateRequest &&
        this.session.request.commandType === AuthenticateRequest.prototype.REQUEST_PAIRING))
  {
    // It's possible that a request is sent, but no burst response is received. In that case, the request must be retried.
    // During pairing, user intervention is necessary, so don't enable timeout

       this.session.burstResponseTimeout =  setTimeout(this.sendNow.bind(this, NO_ERROR, 'Client burst response timeout ' + BURST_RESPONSE_TIMEOUT + ' ms'),
                                                     BURST_RESPONSE_TIMEOUT);

     if (this.log.logging)
       this.log.debug( 'Burst response timeout in ' + BURST_RESPONSE_TIMEOUT +' ms');
     }
};

ANTFSHostChannel.prototype.getHostname = function() {
  return this.hostname;
};

ANTFSHostChannel.prototype.getClientSerialNumber = function() {
  return this.authenticationManager.clientSerialNumber;
};

ANTFSHostChannel.prototype.getClientFriendlyname = function() {
  return this.authenticationManager.clientFriendlyname;
};

ANTFSHostChannel.prototype.onReset = function(err, callback) {

  clearTimeout(this.beaconTimeout);
  clearTimeout(this.session.burstResponseTimeout);
  this.removeAllListeners('CLIENT_NOT_BUSY');
  this.removeAllListeners('HOST_CHANNEL_OPEN');
  this.session = {};

};

// Stops all retry timers/listeners; called before the USB device is closed
ANTFSHostChannel.prototype.shutdown = function ()
{
  this.closed = true;
  clearTimeout(this.beaconTimeout);
  clearTimeout(this.session.burstResponseTimeout);
  this.removeAllListeners('CLIENT_NOT_BUSY');
  this.removeAllListeners('HOST_CHANNEL_OPEN');
};

ANTFSHostChannel.prototype.connect = function(callback) {

  var onConnecting = function _onConnecting(err, msg) {

    if (!err) {
      this.layerState = new State(State.prototype.LINK);
      if (this.log.logging)
        this.log.debug( 'Connecting, host state now ' + this.layerState.toString());
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

ANTFSHostChannel.prototype.setHostSerialNumber = function(serialNumber) {
  this.hostSerialNumber = serialNumber;
};

ANTFSHostChannel.prototype.getHostSerialNumber = function() {
  return this.hostSerialNumber;
};

ANTFSHostChannel.prototype.initRequest = function (request, callback)
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

ANTFSHostChannel.prototype.sendNow = function (e,m)
{
  var MAX_RETRIES = 15,
      err;

  if (this.closed || !this.isTracking()) // in case RX_FAIL_GOTO_SEARCH
    return;

  clearTimeout(this.session.burstResponseTimeout);

  if (++this.session.retry <= MAX_RETRIES)
  {

    if (this.log.logging)
      this.log.debug('Sending request, retry '  + this.session.retry +' ' + m.toString());

    this.session.sendFunc(); // Acknowleded or burst setup in initRequest

  }
  else
  {

    if (this.session.request) {

        err = new Error('Max retries ' + MAX_RETRIES + ' reached for request ' + this.session.request.toString());

        if (this.log.logging)
          this.log.error(err.toString());


        if (this.session.request instanceof DownloadRequest)

          this.emit('download', err);

        else if (this.session.request instanceof EraseRequest)

          this.emit('erase',err);

        else if (this.session.request instanceof UploadRequest || this.session.request instanceof UploadDataRequest)

          this.emit('upload', err, this.transportManager.session);
      }
      else {
        if (this.log.logging)
          this.log.error(e,m);

        console.error('Max retries ' + MAX_RETRIES + ' reached');
        console.trace();

      }
}

};


// Queue an overwrite of the file at directory index with data (Uint8Array). Call before the transport state is reached.
ANTFSHostChannel.prototype.upload = function (index, data)
{
  this.transportManager.addUploadTask(index, data);
};

ANTFSHostChannel.prototype.sendRequest = function (e,m)
{


  if (this.beacon.clientDeviceState.isBusy() && !this.option.ignoreBusyState)
  {
    if (this.log.logging)
      this.log.debug('Client is busy, cannot send request now', this.session);

    this.once('CLIENT_NOT_BUSY',this.sendNow.bind(this,e,m)); // Queue pending transfer on next beacon (onBeacon) when client is not busy
  }
  else
    this.sendNow(e,m);

};

// Override Channel
ANTFSHostChannel.prototype.sendAcknowledged = function(request, callback) {
  this.initRequest(request, callback);
};

// Override Channel
ANTFSHostChannel.prototype.sendBurst = function(request, callback) {
  this.initRequest(request,callback);
};

ANTFSHostChannel.prototype.disconnect = function (callback)
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

module.exports = ANTFSHostChannel;
