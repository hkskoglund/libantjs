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
      AuthenticateResponse = require('./response/authenticateResponse');

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
      waitForLinkClientBeacon : { id : undefined, delay: 60000 },
      waitForAuthenticateClientBeacon : { id : undefined, delay : 60000 }
    };

    this.on('data', this.onBroadcast);
    this.on('burst', this.onBurst);

    this.once('link', this.onLink);                     // Once = Only the first received beacon received triggers callback
    this.once('authentication', this.onAuthentication);

  }

  Host.prototype = Object.create(Channel.prototype);
  Host.prototype.constructor = Channel;

  Host.prototype.connect = function (callback)
  {

    var onNoLinkClientBeacon = function _onNoLinkClientBeacon()
    {
        if (this.log.logging)
          this.log.log('warn','No LINK beacon received from client in '+this.timerID.waitForLinkClientBeacon.delay+' ms');
    }.bind(this);

    // Need host serial number in LINK command
     this.getSerialNumber(function _getSN(err,serialNumberMsg) {
       if (!err)
       {
         this.hostSerialNumber = serialNumberMsg.serialNumber;
       } else
         this.hostSerialNumber = 0;

       this.state = new State(State.prototype.SEARCH);

       this.timerID.waitForLinkClientBeacon.id = setTimeout(onNoLinkClientBeacon,this.timerID.waitForLinkClientBeacon.delay);

       Channel.prototype.connect.call(this,callback);

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
    console.log('ONLINK!!!!!');

    var authentication_RF = this.getAuthenticationRF();

    var onLinkCompleted = function _onLinkSuccess(err,msg) {

                            if (this.log.logging)
                              this.log.log('log','Switching frequency to '+(2400+authentication_RF)+' MHz');

                            this.timerID.waitForAuthenticateClientBeacon.id = setTimeout(onNoAuthenticationFromClient,this.timerID.waitForAuthenticateClientBeacon.delay);

                            this.switchFrequencyAndPeriod(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,
                                function _switchFreq(err,msg) {

                                    this.once('link',this.onLink); // If client drops to link layer again

                                }.bind(this));
                        },

      onLinkFailed = function _onLinkFail(err,msg)
                      {
                        if (this.log.logging)
                          this.log.log('log','Failed to send LINK command to client');

                        this.once('link',this.onLink);

                        // retry?
                      }.bind(this),

     onSentToANT = function _onSentToANT(err,msg)
     {
       if (err && this.log.logging) {
          this.log.log('error','Failed to send LINK command to ANT chip',err);
          this.once('link',this.onLink);
        }

     }.bind(this),

     onNoAuthenticationFromClient = function _onNoAuthenticationFromClient()
     {

      if (this.log.logging)
        this.log.log('warn','Client did not proceed to authentication in '+this.timerID.waitForAuthenticateClientBeacon.delay+' ms');

      this.switchFrequencyAndPeriod(this.NET.FREQUENCY.ANTFS,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, function () {});

      this.once('link',this.onLink);

    }.bind(this),

    onFrequencyAndPeriodSet = function _onFrequencyAndPeriodSet(err,repsonse)
    {
      this.linkCommand =  new LinkCommand(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,this.hostSerialNumber);

      this.state.set(State.prototype.LINK);

      this.sendAcknowledged(this.linkCommand.serialize(), onSentToANT, onLinkCompleted, onLinkFailed);

    }.bind(this);

    if (this.frequency !== this.NET.FREQUENCY.ANTFS)
       this.switchFrequencyAndPeriod(this.NET.FREQUENCY.ANTFS,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, onFrequencyAndPeriodSet);
    else
      onFrequencyAndPeriodSet.call(this);

  };

  Host.prototype.onAuthentication = function ()
  {

    clearTimeout(this.timerID.waitForAuthenticateClientBeacon);

    this.state.set(State.prototype.AUTHENTICATION);

    var onSentToANT = function _onSentToANT(err,msg)
    {
      if (err && this.log.logging)
       this.log.log('error','Failed to send AUTHENTICATE command to ANT chip',err);
    }.bind(this);

    this.authenticateCommand = new AuthenticateCommand();
    this.authenticateCommand.requestClientSerialNumber(this.hostSerialNumber);

    this.sendAcknowledged(this.authenticateCommand.serialize(), onSentToANT);

  };

  Host.prototype.onBeacon = function ()
  {
    var onFrequencyAndPeriodSet = function _onFreqAndPeriodSet(err,msg)
    {
      this.state.set(State.prototype.LINK);
    }.bind(this),
    clientState;

    console.log(this.beacon.toString());

    clientState = this.beacon.clientDeviceState.get();

    switch (clientState)
    {
      case State.prototype.LINK : this.emit('link');

                                  break;

      case State.prototype.AUTHENTICATION:

                                  break;

      case State.prototype.TRANSPORT:

                                  break;

      case State.prototype.BUSY :

                                  break;

    }

  /*  if (this.state.isLink() && this.beacon.clientDeviceState.isLink()) {
      this.emit('link');
    }
    else if (!this.state.isLink() && this.beacon.clientDeviceState.isLink()) // Client dropped to link state
    {
      ;
    } else if (this.beacon.clientDeviceState.isAuthentication() && this.beacon.hostSerialNumber === this.hostSerialNumber) {
      this.emit('authentication');
    } else if (this.beacon.clientDeviceState.isAuthentication() && this.beacon.hostSerialNumber !== this.hostSerialNumber) {
      if (this.log.logging)
        this.log.log('warn','Ignoring client beacon for foreign host serial number ' + this.beacon.hostSerialNumber);
    } */

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
