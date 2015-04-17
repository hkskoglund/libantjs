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
  TransportManager = require('./lib/layer/transportManager'),

  AuthenticateRequest = require('./lib/request-response/authenticateRequest');

function Host(options, host, channel, net, deviceNumber, hostname, download, erase,ls) {

  Channel.call(this, options, host, channel, net);

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

  this.on('burst', this.onBurst.bind(this)); // decodes client beacon

  this.on('beacon', this.onBeacon.bind(this));

  this.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onRxFailGoToSearch.bind(this));

  this.on('reset', this.onReset.bind(this));

  this.on('directory', function _onDirectory(lsl) {
   if (ls)
      console.log(lsl);
  });

  // Initialize layer specific event handlers at the tail of event callbacks
  // Host has priority (in front of event callbacks) because it handles decoding of the client beacon

  this.linkManager = new LinkManager(this);

  this.authenticationManager = new AuthenticationManager(this);

  this.transportManager = new TransportManager(this, download,erase,ls);

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

  this.state = this.SEARCHING;

  if (this.log.logging)
     this.log.log('log', 'Lost contact with client, searching.');

};

Host.prototype.onReset = function(err, callback) {

  clearTimeout(this.beaconTimeout);
  clearTimeout(this.burstResponseTimeout);

  this.removeAllListeners('delayedsend');

  if (this.boundOnTransferTxFailed)
    this.removeListener('EVENT_TRANSFER_TX_FAILED', this.boundOnTransferTxFailed);

  if (this.boundOnTransferRxFailed) {
   this.removeListener('EVENT_TRANSFER_RX_FAILED', this.boundOnTransferRxFailed);
  }

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

Host.prototype.onBeacon = function(beacon) {

  this.state = this.TRACKING;

  clearTimeout(this.beaconTimeout);

  this.beaconTimeout = setTimeout(function _beaconTimeout ()
  {
    if (this.log.logging)
      this.log.log('log','Client beacon timeout');

    this.emit('reset');
  }.bind(this), 25000);

  if (this.log.logging)
    this.log.log('log', this.beacon.toString());


  // Client dropped to link
  if (!this.layerState.isLink() && this.beacon.clientDeviceState.isLink())
  {
    if (this.log.logging)
      this.log.log('log','Client dropped to LINK, Host ',this.layerState.toString(),'Client',this.beacon.clientDeviceState.toString());

    this.emit('reset');
  }
  else if (!this.beacon.clientDeviceState.isBusy())
  {
    if (this.log.logging)
      this.log.log('log','Listeners for delayedsend',this.listeners('delayedsend'));

    this.emit('delayedsend'); // In case requests could not be sent when client was busy
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

  clearTimeout(this.burstResponseTimeout);

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

Host.prototype._sendDelayed = function(request, callback, retryNr, retryMsg) {

  var serializedMsg;

  if (retryNr === undefined)
    retryNr = 0;

  if (retryMsg === undefined)
    retryMsg = '';

  // Spec. 9.4 "The busy state is not cleared from the client beacon until after the appropiate response has been sent"
  // "The host shall not send a request to the client while the beacon indicates it is in the busy state"

  var sendRequest = function _sendRequest()
  {
    var retryIntro;

    if (this.log.logging) {
      if (retryNr)
        retryIntro = 'Retry ' + retryNr + ' ' + retryMsg + ' ';
      else
        retryIntro = '';
      this.log.log('log', retryIntro + 'Sending ' + request.toString() + ' client state ' + this.beacon.clientDeviceState.toString());

    }

    // Spec 12.2 "If a client responds with one of the ANT-FS response messages listed below,
    // this response will be appended to the beacon and sent as a burst transfer" -> there
    // is a possibility of failed receive of burst (EVENT_TRANSFER_RX_FAILED)

    if ([0x04,0x09,0x0A,0x0B,0x0C].indexOf(request.ID) !== -1)
    {

      // It's possible that a request is sent, but no burst response is received. In that case, the request must be retried.
      // During pairing, user intervention is necessary, so don't enable timeout

      if (!(request instanceof AuthenticateRequest && request.commandType === AuthenticateRequest.prototype.REQUEST_PAIRING) ||
          !(request instanceof AuthenticateRequest && request.commandType === AuthenticateRequest.prototype.CLIENT_SERIAL_NUMBER))
      {
        // Set at least after 16 EVENT_RX_FAIL > 2 second with 8 Hz (125 ms period)
         this.burstResponseTimeout = setTimeout(this._sendDelayed.bind(this, request, callback, retryNr + 1,'No burst from client'), 16 * ( this.period / 32768) * 1000 + 1000);
      }

     if (this.boundOnTransferRxFailed) {
       this.removeListener('EVENT_TRANSFER_RX_FAILED', this.boundOnTransferRxFailed);
     }

     this.boundOnTransferRxFailed = this._sendDelayed.bind(this, request, callback, retryNr + 1, 'Transfer RX failed');

     this.once('EVENT_TRANSFER_RX_FAILED', this.boundOnTransferRxFailed);
    }

    if (this.boundOnTransferTxFailed)
      this.removeListener('EVENT_TRANSFER_TX_FAILED', this.boundOnTransferTxFailed);

    this.boundOnTransferTxFailed = this._sendDelayed.bind(this, request, callback, retryNr  + 1,'Transfer TX failed');

    this.once('EVENT_TRANSFER_TX_FAILED', this.boundOnTransferTxFailed);

    serializedMsg = request.serialize();

    if (serializedMsg.length <= 8)
      Channel.prototype.sendAcknowledged.call(this, serializedMsg, callback);
    else
      Channel.prototype.sendBurst.call(this, serializedMsg, callback);

  }.bind(this);

  switch (this.state)
  {
    case this.TRACKING :

      if (!this.beacon.clientDeviceState.isBusy()) {

        sendRequest();

      } else {

        if (this.log.logging)
          this.log.log('log', 'Client is busy, delaying message.');

        if (!this.listeners('delayedsend').length)
         this.once('delayedsend', sendRequest); // Wait for next beacon and client not busy
      }

      break;

   case this.SEARCHING :

     if (!this.listeners('delayedsend').length)
     {
       if (this.log.logging)
         this.log.log('log','Searching for client, send on next client beacon',request);
       this.once('delayedsend', sendRequest); // Wait for next beacon and client not busy
     }

  }

};

// Override Channel
Host.prototype.sendAcknowledged = function(request, callback) {
  this._sendDelayed(request, callback);
};

// Override Channel
Host.prototype.sendBurst = function(request, callback) {
  this._sendDelayed(request,callback);
};

Host.prototype.disconnect = function (callback)
{
  var onDisconnect = function _onDisconnect()
  {
    this.removeAllListeners('beacon');

    this.emit('reset');

    if (typeof callback === 'function')
      callback.call(this,arguments);
  }.bind(this);

  this.linkManager.disconnect(onDisconnect);
};

module.exports = Host;
return module.exports;
