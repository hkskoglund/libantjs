/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var Channel = require('../../channel/channel'),
      ClientBeacon = require('./lib/clientBeacon'),
      State = require('./lib/state'),

      // Commands

      DisconnectCommand = require('./command/disconnectCommand'),

      // Layers

      LinkManager = require('./lib/linkManager'),
      AuthenticationManager = require('./lib/authenticationManager'),
      TransportManager = require('./lib/transportManager'),

      MAX_ACKNOWLEDGED_RETRIES = 3;

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

    this.state = new State();

    this.passkeyDB = {};

    this.on('data', this.onBroadcast);

    //this.on('burst', this.onBurst);

    this.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset);
    this.on('reset', this.onReset);

    this.once('link', this.linkManager.onLink.bind(this.linkManager));                     // Once = Only the first received beacon received triggers callback
    this.once('authenticate', this.authenticationManager.onAuthenticate.bind(this.authenticationManager));
    //this.once('transport',this.onTransport);

  }

  Host.prototype = Object.create(Channel.prototype);
  Host.prototype.constructor = Channel;

  Host.prototype.setPasskey = function (clientDeviceSerialNumber,passkey)
  {
    this.passkeyDB[clientDeviceSerialNumber] = passkey;
  };

  Host.prototype.onReset = function ()
  {

    console.log('ONRESET');

    if (this.frequency !== this.NET.FREQUENCY.ANTFS)
      this.switchFrequencyAndPeriod(this.NET.FREQUENCY.ANTFS,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, function _switchFreqPeriod(err) {
        if (err & this.log.logging)
          this.log.log('error','Failed to reset search frequency to default ANT-FS 2450 MHz');
      }.bind(this));


      this.state.set(State.prototype.LINK);

      this.removeAllListeners('link');
      this.once('link',this.onLink);

      this.removeAllListeners('authenticate');
      this.once('authenticate',this.authenticationManager.onAuthenticate);

  };

  Host.prototype.connect = function (callback)
  {

    Channel.prototype.connect.call(this,this.linkManager.onConnected.bind(this.linkManager,callback));

  };


  Host.prototype._verifyHostSerialNumber = function (type)
  {
    if (this.beacon.hostSerialNumber === this.hostSerialNumber)
       this.emit(type);
    else {
      if (this.log.logging)
        this.log.log('log','Client wishes to communicate with host serial number ',this.beaconSerialNumber);
    }
  };

  Host.prototype.onBeacon = function ()
  {
    var clientState;



    console.log(this.beacon.toString());

    clientState = this.beacon.clientDeviceState.get();

    switch (clientState)
    {
      case State.prototype.LINK : this.emit('link');

                                  break;

      case State.prototype.AUTHENTICATION:

                                  this._verifyHostSerialNumber('authenticate');

                                  break;

      case State.prototype.TRANSPORT:


                                  this._verifyHostSerialNumber('transport');

                                  break;

      case State.prototype.BUSY :

                                  break;

    }

  };

  Host.prototype.onBroadcast = function (broadcast)
  {
    this.beacon.decode(broadcast.payload);
    this.onBeacon();

  };

  Host.prototype.onBurst = function (burst)
  {
    var responseData,
        responseId,
        response;

    this.beacon.decode(burst.subarray(0,ClientBeacon.prototype.PAYLOAD_LENGTH));
    this.onBeacon();

    console.log('BURST!!!!!',burst,'client device state',this.beacon.clientDeviceState);

    responseData = burst.subarray(ClientBeacon.prototype.PAYLOAD_LENGTH);
    responseId = responseData[1]; // Spec sec. 12 ANT-FS Host Command/Response

    switch (responseId) {

      case AuthenticateResponse.prototype.ID :

          response = new AuthenticateResponse(responseData);
          console.log('authenticate',response);
          break;

      case DownloadResponse.prototype.ID :

          response = new DownloadResponse(responseData);
          console.log('download',response);
          break;

      default :

         console.log('cannot deserialize response id',responseId);
         break;
    }

  };

  module.exports = Host;
  return module.exports;
});
