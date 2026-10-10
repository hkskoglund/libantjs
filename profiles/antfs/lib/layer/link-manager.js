'use strict';

const EventEmitter = require('events'),
  ClientBeacon = require('./client-beacon'),
  LinkRequest = require('../request-response/link-request'),
  DisconnectRequest = require('../request-response/disconnect-request'),
  State = require('./util/state');

class LinkManager extends EventEmitter {
  constructor(host) {
    super();

    this.host = host;

    this.log = this.host.log;
    this.logger = this.host.log.log.bind(this.host.log);

    this.host.on('reset', this.onReset.bind(this));

    this.host.on('beacon', this.onBeacon.bind(this));

    this.linkBeaconCount = 0;

    this.once('link', this.onLink.bind(this));
  }

  onReset() {

  this.removeAllListeners('link');
  this.once('link', this.onLink.bind(this));
  this.linkBeaconCount = 0;
  this.host.layerState.set(State.prototype.LINK);
  this.switchFrequencyAndPeriod(this.host.NET.FREQUENCY.ANTFS, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8).catch(() => {
    if (this.log.logging)
      this.log.error( 'Failed to reset search frequency to default ANT-FS 2450 MHz');
  });

  }

  onBeacon(beacon) {
  const MAX_LINK_BEACONS_BEFORE_CONNECT_ATTEMP = 3; // Require client not sending a couple of LINK beacons and then closes channel

  if (beacon.clientDeviceState.isLink()) {
    this.linkBeaconCount++;
    if (this.linkBeaconCount === MAX_LINK_BEACONS_BEFORE_CONNECT_ATTEMP) {
      this.emit('link');
    } else {
      if (this.log.logging)
        this.log.debug( 'Waiting for ' + MAX_LINK_BEACONS_BEFORE_CONNECT_ATTEMP + ' client LINK before host LINK request, now at ' + this.linkBeaconCount);
    }
  }

  }

  onLink() {

  const authentication_RF = this.host.authenticationManager.getAuthenticationRF(),

    onTxCompleted = function _onTxCompleted()
    {
      // LINK is received by client ANT stack now, and client will switch frequency to
      // the requested frequency by the link request and start advertising the authentication beacon

      if (this.host.frequency !== authentication_RF) {

        this.switchFrequencyAndPeriod(authentication_RF, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8).then(() => {
          if (this.log.logging)
            this.log.debug( 'Switched frequency to ' + (2400 + authentication_RF) + ' MHz');
        }, () => {});
      }

    }.bind(this),

    onSentToANT = function _onSentToANT(err) {

      if (err) {

        if (this.log.logging)
          this.log.error( 'Failed to send LINK request to ANT', err);

      }

      // In case client drops to link layer again we must be prepared again

      this.once('link', this.onLink.bind(this));

    }.bind(this),

    onFrequencyAndPeriodSet = function _onFrequencyAndPeriodSet() {

      const linkRequest = new LinkRequest(authentication_RF, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8, this.hostSerialNumber);

      this.once('EVENT_TRANSFER_TX_COMPLETED', onTxCompleted);

      this.sendAcknowledged(linkRequest).then(() => onSentToANT(), onSentToANT);

    }.bind(this.host);




  if (this.host.frequency !== this.host.NET.FREQUENCY.ANTFS)
  // In case client drops to link layer from higher layers (communicating on the agreed upon authentication RF)
    this.switchFrequencyAndPeriod(this.host.NET.FREQUENCY.ANTFS, ClientBeacon.prototype.CHANNEL_PERIOD.Hz8).then(onFrequencyAndPeriodSet, onFrequencyAndPeriodSet); // Continue even if switching failed
  else
    onFrequencyAndPeriodSet.call(this);

  }

  async switchFrequencyAndPeriod(frequency, period) {
  let newPeriod;

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

  if (this.host.frequency !== frequency) {
    try {
      await this.host.setFrequency(frequency);
    } catch (err) {
      if (this.log.logging)
        this.log.error( 'Failed to switch frequency to ' + (2400 + frequency) + 'MHz');
      throw err;
    }
  }

  if (this.host.period !== period) {
    try {
      return await this.host.setPeriod(newPeriod);
    } catch (err) {
      if (this.log.logging)
        this.log.error( 'Failed to switch period to ' + newPeriod);
      throw err;
    }
  }
  }

  // Resolves when the client acknowledges the disconnect, rejects if it is not received
  disconnect() {
    const disconnectRequest = new DisconnectRequest();

    this.host.layerState.set(State.prototype.LINK);

    return new Promise((resolve, reject) => {
      const onCompleted = () => {
        this.host.removeListener('EVENT_TRANSFER_TX_FAILED', onFailed);
        resolve();
      };
      const onFailed = () => {
        const msg = 'Failed to send disconnect request to client, letting client timeout on session';
        this.host.removeListener('EVENT_TRANSFER_TX_COMPLETED', onCompleted);
        if (this.log.logging)
          this.log.debug(msg);
        reject(new Error(msg));
      };

      this.host.once('EVENT_TRANSFER_TX_COMPLETED', onCompleted);
      this.host.once('EVENT_TRANSFER_TX_FAILED', onFailed);

      this.host.sendAcknowledged(disconnectRequest).catch(() => {
        if (this.log.logging)
          this.log.error('Failed to send disconnect request to ANT');
      });
    });
  }
}

module.exports = LinkManager;
