/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var Channel = require('../../channel/channel'),
      ClientBeacon = require('./clientBeacon'),
      State = require('./state'),

      // Commands

      LinkCommand = require('./command/linkCommand'),
      DisconnectCommand = require('./command/disconnectCommand'),

      AuthenticateCommand = require('./command/authenticateCommand'),
      AuthenticateResponse = require('./response/authenticateResponse'),

      SESSION_TIMEOUT = 60000,

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
    this.beacon =  new ClientBeacon();

    this.state = undefined; // INIT

    this.timerID = {
      session : { id : undefined, delay: SESSION_TIMEOUT },
    };

    this.passkeyDB = {};

    this.on('data', this.onBroadcast);
    this.on('burst', this.onBurst);

    this.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset);
    this.on('reset', this.onReset);

    this.once('link', this.onLink);                     // Once = Only the first received beacon received triggers callback
    this.once('authenticate', this.onAuthenticate);

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
      this.once('authenticate',this.onAuthenticate);

      this.resetSessionTimeout();

  };

  Host.prototype.resetSessionTimeout = function ()
  {
    clearTimeout(this.timerID.session.id);
    this.timerID.session.id = setTimeout(this.onSessionTimeout.bind(this),this.timerID.session.delay);
  };

  Host.prototype.onSessionTimeout = function ()
  {
    if (this.log.logging)
      this.log.log('warn','No client beacon '+this.timerID.session.delay+' ms. Host '+this.state.toString()+' Client '+this.beacon.clientDeviceState.toString());

    this.onReset();
  };

  Host.prototype.connect = function (callback)
  {

    var onConnected = function (err,msg)
    {
      // Spec sec 4.1.2 "The host enters the Link state after the ANT slave channel is initialized and opened"
      if (!err)
        this.state = new State(State.prototype.LINK);
      callback(err);
    }.bind(this);

    // Need host serial number in LINK command
     this.getSerialNumber(function _getSN(err,serialNumberMsg) {
       if (!err)
       {
         this.hostSerialNumber = serialNumberMsg.serialNumber;
       } else
         this.hostSerialNumber = 0;

       this.resetSessionTimeout();

       Channel.prototype.connect.call(this,onConnected);

     }.bind(this));
  };

  // New frequency to communicate on when on authentication/transport layer
  Host.prototype.getAuthenticationRF = function ()
  {
    // http://stackoverflow.com/questions/4959975/generate-random-value-between-two-numbers-in-javascript
      var getRandomRF = function ()
          {
            return Math.floor(Math.random()*(this.MAX_RF+1));
          }.bind(this),
          occupiedFrequency = [this.NET.FREQUENCY.ANTFS,this.NET.FREQUENCY['ANT+'],this.NET.FREQUENCY.DEFAULT],
          frequency = getRandomRF();

      while (occupiedFrequency.indexOf(frequency) !== -1)
        frequency = getRandomRF();

      return frequency;
  };

  Host.prototype.onLink = function ()
  {
    var authentication_RF = this.getAuthenticationRF();

    var onLinkCompleted = function _onLinkSuccess(err,msg) {

                            if (this.frequency !== authentication_RF) {

                              if (this.log.logging)
                                this.log.log('log','Switching frequency to '+(2400+authentication_RF)+' MHz');

                              this.switchFrequencyAndPeriod(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,
                                  function _switchFreq(err,msg) {

                                  }.bind(this));
                              }
                        },

      onLinkFailed = function _onLinkFail(err,msg)
                      {

                        if (this.log.logging)
                          this.log.log('log','Failed to send LINK command to client');

                      }.bind(this),

     onSentToANT = function _onSentToANT(err,msg)
     {
       if (err && this.log.logging) {
          this.log.log('error','Failed to send LINK command to ANT chip',err);

          this.once('link',this.onLink);
        }

     }.bind(this),

    onFrequencyAndPeriodSet = function _onFrequencyAndPeriodSet(err,repsonse)
    {
      this.linkCommand =  new LinkCommand(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,this.hostSerialNumber);

      this.sendAcknowledged(this.linkCommand.serialize(), onSentToANT, onLinkCompleted, onLinkFailed,MAX_ACKNOWLEDGED_RETRIES);

    }.bind(this);

    if (this.frequency !== this.NET.FREQUENCY.ANTFS)
       this.switchFrequencyAndPeriod(this.NET.FREQUENCY.ANTFS,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, onFrequencyAndPeriodSet);
    else
      onFrequencyAndPeriodSet.call(this);

  };

  Host.prototype.onAuthenticate = function ()
  {

    this.once('link',this.onLink); // If client drops to link layer again

    this.state.set(State.prototype.AUTHENTICATION);

    var onSentToANT = function _onSentToANT(err,msg)
    {
      if (err && this.log.logging)
       this.log.log('error','Failed to send AUTHENTICATE command to ANT chip',err);
    }.bind(this);

    this.authenticateCommand = new AuthenticateCommand();
    //this.authenticateCommand.requestClientSerialNumber(this.hostSerialNumber);
    if (this.beacon.authenticationType.isPassthrough())
     this.sendAcknowledged(this.authenticateCommand.serialize(), onSentToANT, MAX_ACKNOWLEDGED_RETRIES);

  };

  Host.prototype.onBeacon = function ()
  {
    var clientState;

    this.resetSessionTimeout();

    console.log(this.beacon.toString());

    clientState = this.beacon.clientDeviceState.get();

    switch (clientState)
    {
      case State.prototype.LINK : this.emit('link');

                                  break;

      case State.prototype.AUTHENTICATION:

                                  if (this.beacon.hostSerialNumber === this.hostSerialNumber)
                                     this.emit('authenticate');
                                  else {
                                    if (this.log.logging)
                                      this.log.log('log','Client wishes to communicate with host serial number ',this.beaconSerialNumber);
                                  }

                                  break;

      case State.prototype.TRANSPORT:

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
          console.log('resp',response);
          break;

      default :
         console.log('cannot deserialize response id',responseId);
         break;
    }

  };

  Host.prototype.switchFrequencyAndPeriod = function (frequency,period,callback)
  {

    var newPeriod;

    switch (period)
    {
      case ClientBeacon.prototype.CHANNEL_PERIOD.Hz05 : newPeriod = 65535; break;
      case ClientBeacon.prototype.CHANNEL_PERIOD.Hz1 : newPeriod = 32768; break;
      case ClientBeacon.prototype.CHANNEL_PERIOD.Hz2 : newPeriod = 16384; break;
      case ClientBeacon.prototype.CHANNEL_PERIOD.Hz4 : newPeriod = 8192; break;
      case ClientBeacon.prototype.CHANNEL_PERIOD.Hz8 : newPeriod = 4096; break;
    }

    this.setFrequency(frequency, function _setFreq(err,msg)
    {
      if (err)
       {
         if (this.log.logging)
            this.log.log('error','Failed to switch frequency to '+(2400+frequency)+'MHz');
         callback(err);
         return;
       }

      this.setPeriod(newPeriod, function _setPeriod(err,msg)
      {
        if (err)
         {
           if (this.log.logging)
              this.log.log('error','Failed to switch period to '+newPeriod);
         }

        callback(err,msg);
      }.bind(this));
  }.bind(this));

  };

  module.exports = Host;
  return module.exports;
});
