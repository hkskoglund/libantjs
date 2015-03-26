/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var  EventEmitter = require('../../../../util/events'),
       ClientBeacon = require('./clientBeacon'),
       LinkCommand = require('../command-response/linkCommand'),
       DisconnectCommand = require('../command-response/disconnectCommand'),
       State = require('./util/state');

  function LinkManager(host)
  {
    EventEmitter.call(this);

    this.host = host;

    this.log = this.host.log;
    this.logger = this.host.log.log.bind(this.host.log);

    this.host.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));

    this.host.on('beacon',this.onBeacon.bind(this));

    this.once('link',this.onLink);

    this.linkBeaconCount = 0;
  }

  LinkManager.prototype = Object.create(EventEmitter.prototype);
  LinkManager.prototype.constructor = LinkManager;

  LinkManager.prototype.onReset = function ()
  {
      this.removeAllListeners('link');
      this.once('link',this.onLink);
      this.host.state.set(State.prototype.LINK);
  };

  LinkManager.prototype.onBeacon = function (beacon)
  {
   var MAX_LINK_BEACONS_BEFORE_CONNECT_ATTEMP = 3;

    if (beacon.clientDeviceState.isLink())
    {
      this.linkBeaconCount++;
    //  this.host.state.set(State.prototype.LINK);
      if (this.linkBeaconCount >= MAX_LINK_BEACONS_BEFORE_CONNECT_ATTEMP) {
          this.linkBeaconCount = 0;
          this.emit('link');
       }
       else
         console.log('linkcounter',this.linkBeaconCount);
    }

  };

  LinkManager.prototype.onLink = function ()
  {

    var authentication_RF = this.host.authenticationManager.getAuthenticationRF(),

     onSentToClient = function _onSentToClient(err, RFevent)
     {
       if (err ) {

         if (this.log.logging)
          this.log.log('error','Failed to send LINK command to client',err);


        } else {

          // LINK is received by client ANT stack now, and client will switch frequency to
          // the requested frequency by the link command and start advertising the authentication beacon

           if (this.host.frequency !== authentication_RF) {

             this.switchFrequencyAndPeriod(authentication_RF, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,
                 function _switchFreq(err,msg) {
                   if (!err && this.log.logging)
                     this.log.log('log','Switched frequency to '+(2400+authentication_RF)+' MHz');
                 }.bind(this.host));
             }

        }

        // In case client drops to link layer again we must be prepared again

         this.once('link',this.onLink);

     }.bind(this),

    onFrequencyAndPeriodSet = function _onFrequencyAndPeriodSet(err,repsonse)
    {
      var linkCommand =  new LinkCommand(authentication_RF, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,
                                          this.hostSerialNumber);

      this.sendAcknowledged(linkCommand, onSentToClient);

    }.bind(this.host);

    if (this.host.frequency !== this.host.NET.FREQUENCY.ANTFS)
    // In case client drops to link layer from higher layers (communicating on the agreed upon authentication RF)
       this.switchFrequencyAndPeriod(this.host.NET.FREQUENCY.ANTFS,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, onFrequencyAndPeriodSet.bind(this));
    else
      onFrequencyAndPeriodSet.call(this);

  };

  LinkManager.prototype.switchFrequencyAndPeriod = function (frequency, period, callback)
  {

    var newPeriod;

    switch (period)
    {
      case ClientBeacon.prototype.CHANNEL_PERIOD.Hz05 : newPeriod = 65535;  break;
      case ClientBeacon.prototype.CHANNEL_PERIOD.Hz1  : newPeriod = 32768;  break;
      case ClientBeacon.prototype.CHANNEL_PERIOD.Hz2  : newPeriod = 16384;  break;
      case ClientBeacon.prototype.CHANNEL_PERIOD.Hz4  : newPeriod = 8192;   break;
      case ClientBeacon.prototype.CHANNEL_PERIOD.Hz8  : newPeriod = 4096;   break;
    }

    this.host.setFrequency(frequency, function _setFreq(err, msg)
    {

      if (err)
       {
         if (this.log.logging)
            this.log.log('error','Failed to switch frequency to '+(2400+frequency)+'MHz');
         callback(err);
         return;
       }

      this.setPeriod(newPeriod, function _setPeriod(err, msg)
      {
        if (err)
         {
           if (this.log.logging)
              this.log.log('error','Failed to switch period to '+newPeriod);
         }

        callback(err,msg);

      }.bind(this.host));
    }.bind(this.host));
  };

  LinkManager.prototype.disconnect = function (callback)
  {
    console.trace();
    var disconnectCommand = new DisconnectCommand();

    this.host.state.set(State.prototype.LINK);
    this.host.sendAcknowledged(disconnectCommand, callback);
  };

  module.exports = LinkManager;
  return module.exports;

});
