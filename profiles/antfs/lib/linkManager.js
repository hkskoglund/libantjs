/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var LinkCommand = require('../command/linkCommand');

  function LinkManager(host)
  {
    this.host = host;
  }

  LinkManager.prototype.onConnected = function (callback,err,msg)
  {
    // Spec sec 4.1.2 "The host enters the Link state after the ANT slave channel is initialized and opened"
    if (!err)
    {

      // Need host serial number in LINK command

       this.host.getSerialNumber(function _getSN(err,serialNumberMsg) {
         if (!err)
         {
           this.host.hostSerialNumber = serialNumberMsg.serialNumber;
         } else
           this.host.hostSerialNumber = 0;
         }.bind(this));
    }

    callback(err);
  };

  LinkManager.prototype.onLink = function ()
  {

    var authentication_RF = this.host.authenticationManager.getAuthenticationRF();

    var onLinkCompleted = function _onLinkSuccess(err,msg) {

                            if (this.frequency !== authentication_RF) {

                              if (this.log.logging)
                                this.log.log('log','Switching frequency to '+(2400+authentication_RF)+' MHz');

                              this.switchFrequencyAndPeriod(authentication_RF,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,
                                  function _switchFreq(err,msg) {

                                  }.bind(this.host));
                              }
                        }.bind(this.host),

      onLinkFailed = function _onLinkFail(err,msg)
                      {

                        if (this.log.logging)
                          this.log.log('log','Failed to send LINK command to client');

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

      this.sendAcknowledged(this.linkCommand.serialize(), onSentToANT, onLinkCompleted, onLinkFailed, MAX_ACKNOWLEDGED_RETRIES);

    }.bind(this.host);

    if (this.host.frequency !== this.host.NET.FREQUENCY.ANTFS)
       this.switchFrequencyAndPeriod(this.NET.FREQUENCY.ANTFS,ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, onFrequencyAndPeriodSet);
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
      }.bind(this.host));
    }.bind(this.host));
  };

  module.exports = LinkManager;
  return module.exports;

});
