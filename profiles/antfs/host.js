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

      beacon = new ClientBeacon(),

      hostSN,

      link, // LINK command

      authentication_RF = 20; // New frequency to communicate on

  function Host(options, host, channelNumber, net)
  {

    Channel.call(this,options, host, channelNumber, net);

    // ANT-FS Technical specification, p.44 10.2 Host Device ANT Configuration
    this.key = this.NET.KEY.ANTFS;
    this.frequency = this.NET.FREQUENCY.ANTFS;
    this.period = this.NET.PERIOD.ANTFS;
    this.lowPrioritySearchTimeout = 0xFF; // INFINITE

    this.state = new State(State.prototype.LINK);

    this.on('data', this.onBroadcast);
    this.on('burst', this.onBurst);

    this.once('link', this.onLink);
  
  }

  Host.prototype = Object.create(Channel.prototype);
  Host.prototype.constructor = Channel;

  Host.prototype.connect = function (callback)
  {
    // Need host serial number in LINK command
     this.getSerialNumber(function _getSN(err,serialNumberMsg) {
       if (!err)
       {
         hostSN = serialNumberMsg.serialNumber;
       } else
         hostSN = 0;

        link =  new Link(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,hostSN);
       Channel.prototype.connect.call(this,callback);
     }.bind(this));
  };

  Host.prototype.onLink = function ()
  {

    var onLinkCompleted = function _onLinkSuccess(err,msg) {

                            if (this.log.logging)
                              this.log.log('log','Switching frequency to '+(2400+authentication_RF)+' MHz');

                            this.switchFrequencyAndPeriod(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, function _switchFreq(err,msg) {

                                this.state.set(State.prototype.AUTHENTICATION);

                                this.once('link',this.onLink); // If client drops to link layer again

                                // Client should send authentication beacon for about 3 seconds (910XT)
                                // If no authentication command from host, client returns to link state

                            }.bind(this));
                        },

      onLinkFailed = function _onLinkFail(err,msg)
                      {
                        if (this.log.logging)
                          this.log.log('log','Failed to send LINK command to client');

                        // retry?
                      }.bind(this);


  // Recommended to switch RF frequency for further communication

    this.sendAcknowledged(link.serialize(), function (err) {
      if (err && this.log.logging)
       this.log.log('error','Failed to send LINK command to ANT chip',err);
    }.bind(this), onLinkCompleted, onLinkFailed);

  };

  Host.prototype.onBroadcast = function (error,broadcast)
  {
    beacon.decode(broadcast.payload);
    console.log('clientbeacon',beacon,beacon.toString());

    if (this.state.isLink() && beacon.clientDeviceState.isLink())
      this.emit('link');
    else if (!this.state.isLink() && beacon.clientDeviceState.isLink()) // Client dropped to link state
    {
      this.switchFrequencyAndPeriod(this.NET.FREQUENCY.ANTFS,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,
                                    function (err,msg) { this.state.set(State.prototype.LINK);}.bind(this));
    }

  };

  Host.prototype.onBurst = function ()
  {

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
