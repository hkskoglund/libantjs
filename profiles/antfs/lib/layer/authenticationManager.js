/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

var   EventEmitter = require('../../../../util/events'),
      ClientBeacon = require('./clientBeacon'),
      AuthenticateCommand = require('../command/authenticateCommand'),
      AuthenticateResponse = require('../response/authenticateResponse'),
      State = require('./state');

  function AuthenticationManager(host)
  {
    EventEmitter.call(this);

    this.host = host;
    this.host.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));
    this.host.on('beacon',this.onBeacon.bind(this));

    this.once('authenticate',this.onAuthenticate);
  }

  AuthenticationManager.prototype = Object.create(EventEmitter.prototype);
  AuthenticationManager.prototype.constructor = AuthenticationManager;

  AuthenticationManager.prototype.onReset = function ()
  {
    this.removeAllListeners('authenticate');
    this.once('authenticate',this.onAuthenticate);
  };

  AuthenticationManager.prototype.onBeacon = function (beacon)
  {
    if (beacon.clientDeviceState.isAuthentication() && beacon.forHost(this.host.hostSerialNumber))
      {
        this.emit('authenticate');
      }
  };

  AuthenticationManager.prototype.onBurst = function (burst)
  {
    var responseData,
        responseId,
        response;

    if (!this.host.beacon.forHost(this.host.hostSerialNumber))
       return;

    responseData = burst.subarray(ClientBeacon.prototype.PAYLOAD_LENGTH);
    responseId = responseData[1]; // Spec sec. 12 ANT-FS Host Command/Response

    if  (responseId === AuthenticateResponse.prototype.ID) {
          response = new AuthenticateResponse(responseData);
          console.log('authenticate',response);
        }

  };

  // New frequency to communicate on when on authentication/transport layer
  AuthenticationManager.prototype.getAuthenticationRF = function ()
  {
    // http://stackoverflow.com/questions/4959975/generate-random-value-between-two-numbers-in-javascript
      var getRandomRF = function ()
          {
            return Math.floor(Math.random()*(this.MAX_RF+1));
          }.bind(this.host),
          occupiedFrequency = [this.host.NET.FREQUENCY.ANTFS,this.host.NET.FREQUENCY['ANT+'],this.host.NET.FREQUENCY.DEFAULT],
          frequency = getRandomRF();

      while (occupiedFrequency.indexOf(frequency) !== -1)
        frequency = getRandomRF();

      return frequency;
  };

  AuthenticationManager.prototype.onAuthenticate = function ()
  {

        this.host.state.set(State.prototype.AUTHENTICATION);

        var onSentToANT = function _onSentToANT(err,msg)
        {
          if (err && this.log.logging)
           this.log.log('error','Failed to send AUTHENTICATE command to ANT chip',err);
        }.bind(this.host);

        this.authenticateCommand = new AuthenticateCommand();
        //this.authenticateCommand.requestClientSerialNumber(this.hostSerialNumber);
        if (this.host.beacon.authenticationType.isPassthrough())
         this.host.sendAcknowledged(this.authenticateCommand.serialize(), onSentToANT);

  };

  module.exports = AuthenticationManager;
  return module.exports;

});
