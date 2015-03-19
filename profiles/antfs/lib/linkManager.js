/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var  EventEmitter = require('../../../util/events'),
       ClientBeacon = require('./clientBeacon'),
       LinkCommand = require('../command/linkCommand'),
       State = require('./state');

  function LinkManager(host)
  {
    this.host = host;
    this.host.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));
    this.host.on('beacon',this.onBeacon.bind(this));

    this.once('link',this.onLink);
  }

  LinkManager.prototype = Object.create(EventEmitter.prototype);
  LinkManager.prototype.constructor = LinkManager;

  LinkManager.prototype.onReset = function ()
  {
      this.removeAllListeners('link');
      this.once('link',this.onLink);
  };

  LinkManager.prototype.onBeacon = function (beacon)
  {

    if (beacon.clientDeviceState.isLink())
    {
      this.host.state.set(State.prototype.LINK);
      this.emit('link');
    }

  };

  LinkManager.prototype.onLink = function ()
  {

    var authentication_RF = this.host.authenticationManager.getAuthenticationRF();

    var onLinkCompleted = function _onLinkSuccess(err,msg) {

                           // LINK is received by client ANT stack now, and client will switch frequency to
                           // the requested frequency on the link command and start advertising authentication beacon

                            if (this.host.frequency !== authentication_RF) {

                              this.switchFrequencyAndPeriod(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,
                                  function _switchFreq(err,msg) {
                                    if (!err && this.log.logging)
                                      this.log.log('log','Switched frequency to '+(2400+authentication_RF)+' MHz');
                                  }.bind(this.host));
                              }

                            // In case client drops to link layer again we must be prepared again

                             this.once('link',this.onLink);

                        }.bind(this),

      onLinkFailed = function _onLinkFail(err,msg)
                      {

                        if (this.log.logging)
                          this.log.log('log','Failed to send LINK command to client');

                        this.once('link',this.onLink);

                      }.bind(this.host),

     onSentToANT = function _onSentToANT(err,msg)
     {
       if (err && this.log.logging) {
          this.log.log('error','Failed to send LINK command to ANT chip',err);

          this.once('link',this.onLink);
        }

     }.bind(this.host),

    onFrequencyAndPeriodSet = function _onFrequencyAndPeriodSet(err,repsonse)
    {
      this.linkCommand =  new LinkCommand(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,this.hostSerialNumber);

      this.sendAcknowledged(this.linkCommand.serialize(), onSentToANT, onLinkCompleted, onLinkFailed);

    }.bind(this.host);

    if (this.host.frequency !== this.host.NET.FREQUENCY.ANTFS)
    // In case client drops to link layer from higher layers (communicating on the agreed upon authentication RF)
       this.switchFrequencyAndPeriod(this.host.NET.FREQUENCY.ANTFS,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, onFrequencyAndPeriodSet.bind(this));
    else
      onFrequencyAndPeriodSet.call(this);

  };

  LinkManager.prototype.switchFrequencyAndPeriod = function (frequency,period,callback)
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

    this.host.setFrequency(frequency, function _setFreq(err,msg)
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
      }.bind(this.host));
    }.bind(this.host));
  };

  module.exports = LinkManager;
  return module.exports;

});
