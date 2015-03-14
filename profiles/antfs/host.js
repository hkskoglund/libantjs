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

      Link = require('./command/link'),
      Disconnect = require('./command/disconnect'),

      // Beacon

      beacon = new ClientBeacon();



  function Host(options, host, channelNumber, net)
  {

    Channel.call(this,options, host, channelNumber, net);

    // ANT-FS Technical specification, p.44 10.2 Host Device ANT Configuration
    this.key = this.NET.KEY.ANTFS;
    this.frequency = this.NET.FREQUENCY.ANTFS;
    this.period = this.NET.PERIOD.ANTFS;
    this.lowPrioritySearchTimeout = 0xFF; // INFINITE

    this.state = new State(State.prototype.LINK);

    this.hostSerialNumber = undefined;

    this.linkCommand = undefined;

    this.hostName = 'antfsjs';

    this.on('data', this.onBroadcast);
    this.on('burst', this.onBurst);

    this.on('clientbeacon', this.onBeacon);

    this.once('link', this.onLink);                     // Once = Only the first received beacon received triggers callback
    this.once('authentication', this.onAuthentication);

  }

  Host.prototype = Object.create(Channel.prototype);
  Host.prototype.constructor = Channel;

  Host.prototype.connect = function (callback)
  {
    // Need host serial number in LINK command
     this.getSerialNumber(function _getSN(err,serialNumberMsg) {
       if (!err)
       {
         this.hostSerialNumber = serialNumberMsg.serialNumber;
       } else
         this.hostSerialNumber = 0;


       Channel.prototype.connect.call(this,callback);
     }.bind(this));
  };

  // New frequency to communicate on when on authentication/transport layer
  Host.prototype.getAuthenticationRF = function ()
  {
    // http://stackoverflow.com/questions/4959975/generate-random-value-between-two-numbers-in-javascript
      var getRandomRF = function ()
          {
            return Math.floor(Math.random()*125);
          },
          invalidFreq = [this.NET.FREQUENCY.ANTFS,this.NET.FREQUENCY['ANT+'],66],
          frequency = getRandomRF();

      while (invalidFreq.indexOf(frequency) !== -1)
        frequency = getRandomRF();

      return frequency;
  };

  Host.prototype.onLink = function ()
  {

    var authentication_RF = this.getAuthenticationRF();

    var onLinkCompleted = function _onLinkSuccess(err,msg) {

                            if (this.log.logging)
                              this.log.log('log','Switching frequency to '+(2400+authentication_RF)+' MHz');

                            this.switchFrequencyAndPeriod(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, function _switchFreq(err,msg) {

                                this.state.set(State.prototype.AUTHENTICATION);

                                this.once('link',this.onLink); // If client drops to link layer again

                                // Client should send authentication beacon
                                // If no authentication command from host, client returns to link state after a timeout

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
       if (err && this.log.logging)
        this.log.log('error','Failed to send LINK command to ANT chip',err);
     }.bind(this);

    // Recommended to switch RF frequency for further communication

    this.linkCommand =  new Link(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,this.hostSerialNumber);

    this.sendAcknowledged(this.linkCommand.serialize(), onSentToANT, onLinkCompleted, onLinkFailed);

  };

  Host.prototype.onAuthentication = function ()
  {


  };

  Host.prototype.onBeacon = function ()
  {
    var onFrequencyAndPeriodSet = function _onFreqAndPeriodSet(err,msg)
    {
      this.state.set(State.prototype.LINK);
    }.bind(this);

    console.log(beacon.toString());

    if (this.state.isLink() && beacon.clientDeviceState.isLink()) {
      this.emit('link');
    }
    else if (!this.state.isLink() && beacon.clientDeviceState.isLink()) // Client dropped to link state
    {
      this.switchFrequencyAndPeriod(this.NET.FREQUENCY.ANTFS,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, onFrequencyAndPeriodSet);
    } else if (beacon.clientDeviceState.isAuthentication() && beacon.hostSerialNumber === this.hostSerialNumber) {
      this.emit('authentication');
    } else if (beacon.clientDeviceState.isAuthentication() && beacon.hostSerialNumber !== this.hostSerialNumber) {
      if (this.log.logging)
        this.log.log('warn','Ignoring client beacon for foreign host serial number ' + beacon.hostSerialNumber);
    }

  };

  Host.prototype.onBroadcast = function (broadcast)
  {
    beacon.decode(broadcast.payload);

    this.emit('clientbeacon');

  };

  Host.prototype.onBurst = function (burst)
  {
    // 1 packet should be a beacon
    beacon.decode(burst.subarray(0,8));

    this.emit('clientbeacon');
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
