/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */


/*jshint -W097 */
'use strict';

var EventEmitter = require('events'),
  ClientBeacon = require('./clientBeacon'),
  LinkRequest = require('../request-response/linkRequest'),
  DisconnectRequest = require('../request-response/disconnectRequest'),
  State = require('./util/state');

function LinkManager(host) {

  EventEmitter.call(this);

  this.host = host;

  this.log = this.host.log;
  this.logger = this.host.log.log.bind(this.host.log);

  this.host.on('reset', this.onReset.bind(this));

  this.host.on('beacon', this.onBeacon.bind(this));

  this.linkBeaconCount = 0;

  this.once('link', this.onLink.bind(this));


}

LinkManager.prototype = Object.create(EventEmitter.prototype);
LinkManager.prototype.constructor = LinkManager;

LinkManager.prototype.onReset = function() {

  var onSwitchedFreqPeriod = function _onSwitchedFreqPeriod(e,m)
  {
    if (e & this.log.logging)
      this.log.log('error', 'Failed to reset search frequency to default ANT-FS 2450 MHz');

    //if (typeof callback === 'function')
    //  callback(e);
  }.bind(this);

  this.removeAllListeners('link');
  this.once('link', this.onLink.bind(this));
  this.linkBeaconCount = 0;
  this.host.layerState.set(State.prototype.LINK);
  this.switchFrequencyAndPeriod(this.host.NET.FREQUENCY.ANTFS, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, onSwitchedFreqPeriod);

};

LinkManager.prototype.onBeacon = function(beacon) {
  var MAX_LINK_BEACONS_BEFORE_CONNECT_ATTEMP = 3; // Require client not sending a couple of LINK beacons and then closes channel

  if (beacon.clientDeviceState.isLink()) {
    this.linkBeaconCount++;
    //console.log('lcount', this.linkBeaconCount);
    //  this.host.state.set(State.prototype.LINK);
    if (this.linkBeaconCount === MAX_LINK_BEACONS_BEFORE_CONNECT_ATTEMP) {
      this.emit('link');
    } else {
      if (this.log.logging)
        this.log.log('log', 'Waiting for ' + MAX_LINK_BEACONS_BEFORE_CONNECT_ATTEMP + ' client LINK before host LINK request, now at ' + this.linkBeaconCount);
    }
  }

};

LinkManager.prototype.onLink = function() {

  var authentication_RF = this.host.authenticationManager.getAuthenticationRF(),

    onTxCompleted = function _onTxCompleted(e,m)
    {
      // LINK is received by client ANT stack now, and client will switch frequency to
      // the requested frequency by the link request and start advertising the authentication beacon

      if (this.host.frequency !== authentication_RF) {

        this.switchFrequencyAndPeriod(authentication_RF, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8,
          function _switchFreq(err, msg) {
            if (!err && this.log.logging)
              this.log.log('log', 'Switched frequency to ' + (2400 + authentication_RF) + ' MHz');
          }.bind(this.host));
      }

    }.bind(this),

    onSentToANT = function _onSentToANT(err, RFevent) {

      if (err) {

        if (this.log.logging)
          this.log.log('error', 'Failed to send LINK request to ANT', err);

      }

      // In case client drops to link layer again we must be prepared again

      this.once('link', this.onLink.bind(this));

    }.bind(this),

    onFrequencyAndPeriodSet = function _onFrequencyAndPeriodSet(err, repsonse) {

      var linkRequest = new LinkRequest(authentication_RF, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, this.hostSerialNumber);

      this.once('EVENT_TRANSFER_TX_COMPLETED', onTxCompleted);

      this.sendAcknowledged(linkRequest, onSentToANT);

    }.bind(this.host);




  if (this.host.frequency !== this.host.NET.FREQUENCY.ANTFS)
  // In case client drops to link layer from higher layers (communicating on the agreed upon authentication RF)
    this.switchFrequencyAndPeriod(this.host.NET.FREQUENCY.ANTFS, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, onFrequencyAndPeriodSet.bind(this));
  else
    onFrequencyAndPeriodSet.call(this);

};

LinkManager.prototype.switchFrequencyAndPeriod = function(frequency, period, callback) {

  var newPeriod,
    switchFreq = function _switchFreq(e, m) {
      if (this.host.frequency !== frequency)
        this.host.setFrequency(frequency, function _setFreq(err, msg) {

          if (err) {
            if (this.log.logging)
              this.log.log('error', 'Failed to switch frequency to ' + (2400 + frequency) + 'MHz');
            callback(err);
            return;
          }

          switchPeriod();
        }.bind(this));
      else
        switchPeriod();

    }.bind(this),

    switchPeriod = function _switchPeriod(e, m) {
      if (this.host.period !== period)
        this.host.setPeriod(newPeriod, function _setPeriod(err, msg) {
          if (err) {
            if (this.log.logging)
              this.log.log('error', 'Failed to switch period to ' + newPeriod);
          }

          callback(err, msg);
        }.bind(this));
      else
        callback();
    }.bind(this);

  switch (period) {

    case ClientBeacon.prototype.CHANNEL_PERIOD.Hz05:
      newPeriod = 65535;
      break;

    case ClientBeacon.prototype.CHANNEL_PERIOD.Hz1:
      newPeriod = 32768;
      break;

    case ClientBeacon.prototype.CHANNEL_PERIOD.Hz2:
      newPeriod = 16384;
      break;

    case ClientBeacon.prototype.CHANNEL_PERIOD.Hz4:
      newPeriod = 8192;
      break;

    case ClientBeacon.prototype.CHANNEL_PERIOD.Hz8:
      newPeriod = 4096;
      break;
  }

  switchFreq();
};

LinkManager.prototype.disconnect = function(callback) {

  var disconnectRequest = new DisconnectRequest(),
        onSentToANT = function _onSentToANT(e,m)
        {
          if (e)
          {
            if (this.log.logging)
              this.log.log('error','Failed to send disconnect request to ANT');
          }
        };

  this.host.layerState.set(State.prototype.LINK);

  this.host.once('EVENT_TRANSFER_TX_COMPLETED', callback);
  this.host.once('EVENT_TRANSFER_TX_FAILED', function _disconnectFailed (){
    var msg = 'Failed to send disconnect request to client, letting client timeout on session';
    this.host.removeListener('EVENT_TRANSFER_TX_COMPLETED',callback);
    if (this.log.logging)
      this.log.log('log',msg);
    callback(new Error(msg));

  }.bind(this));

  this.host.sendAcknowledged(disconnectRequest, onSentToANT);
};

module.exports = LinkManager;
return module.exports;
