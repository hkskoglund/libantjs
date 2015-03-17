/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var MAX_ACKNOWLEDGED_RETRIES = 3,
      AuthenticateCommand = require('../command/authenticateCommand'),
      AuthenticateResponse = require('../response/authenticateResponse');

  function AuthenticationManager(host)
  {
    this.host = host;
  }

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

        this.once('link',this.host.onLink); // If client drops to link layer again

        this.host.state.set(State.prototype.AUTHENTICATION);

        var onSentToANT = function _onSentToANT(err,msg)
        {
          if (err && this.log.logging)
           this.log.log('error','Failed to send AUTHENTICATE command to ANT chip',err);
        }.bind(this.host);

        this.authenticateCommand = new AuthenticateCommand();
        //this.authenticateCommand.requestClientSerialNumber(this.hostSerialNumber);
        if (this.host.beacon.authenticationType.isPassthrough())
         this.sendAcknowledged(this.authenticateCommand.serialize(), onSentToANT, MAX_ACKNOWLEDGED_RETRIES);

  };

  module.exports = AuthenticationManager;
  return module.exports;

});
