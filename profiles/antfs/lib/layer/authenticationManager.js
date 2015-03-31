/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

/*jshint -W097 */
/*jshint -W097 */
'use strict';

  var EventEmitter = require('events'),
    ClientBeacon = require('./clientBeacon'),
    AuthenticateCommand = require('../command-response/authenticateCommand'),
    AuthenticateResponse = require('../command-response/authenticateResponse'),
    State = require('./util/state');

  function AuthenticationManager(host) {
    EventEmitter.call(this);

    this.host = host;

    this.log = this.host.log;
    this.logger = this.host.log.log.bind(this.host.log);

    this.host.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));

    this.host.on('beacon', this.onBeacon.bind(this));
    this.host.on('burst', this.onBurst.bind(this));

    this.once('authenticate', this.onAuthenticate);

    this.pairingDB = {};

    this.session = {
      command: [],
      response: []
    };
  }

  AuthenticationManager.prototype = Object.create(EventEmitter.prototype);
  AuthenticationManager.prototype.constructor = AuthenticationManager;

  AuthenticationManager.prototype.onReset = function() {
    this.session = {
      command: [],
      response: []
    };

    this.removeAllListeners();

    this.once('authenticate', this.onAuthenticate);

  };

  AuthenticationManager.prototype.onBeacon = function(beacon) {

    if (beacon.clientDeviceState.isAuthentication() && beacon.forHost(this.host.getHostSerialNumber()) &&
      this.host.state.isLink()) {
      this.emit('authenticate');
    }
  };

  AuthenticationManager.prototype.handleResponse = function(response) {
    this.session.response.push(response);

    if (this.log.logging)
      this.logger('log', response.toString());

    switch (response.type) {
      case AuthenticateResponse.prototype.CLIENT_SERIAL_NUMBER:

        this.emit('serialNumber', undefined, response);
        break;

      case AuthenticateResponse.prototype.ACCEPT:

        this.emit('acceptOrReject', undefined, response);
        break;

      case AuthenticateResponse.prototype.REJECT:

        this.emit('acceptOrReject', new Error(response.toString()), undefined);
        break;

    }
  };

  AuthenticationManager.prototype.onBurst = function(burst) {
    var responseData,
      responseId,
      response;

    if (!(this.host.beacon.forHost(this.host.getHostSerialNumber()) &&
        this.host.state.isAuthentication()))
      return;

    responseData = burst.subarray(ClientBeacon.prototype.PAYLOAD_LENGTH);
    responseId = responseData[1]; // Spec sec. 12 ANT-FS Host Command/Response

    if (responseId === AuthenticateResponse.prototype.ID) {

      response = new AuthenticateResponse(responseData);

      // Handle case where client serial number is sent as 4 0 bytes in pairing response
      // Don't know why 910XT antfs stack sends it, either a bug or for not associating passkey with client
      // Spec 12.5.2.3; "The client device's serial number shall also be provided in the Authenticate response"
      if (!this.clientSerialNumber && response.clientSerialNumber)
        this.clientSerialNumber = response.clientSerialNumber;

      this.handleResponse(response);
    }

  };

  // New frequency to communicate on when on authentication/transport layer
  AuthenticationManager.prototype.getAuthenticationRF = function() {
    // http://stackoverflow.com/questions/4959975/generate-random-value-between-two-numbers-in-javascript
    var getRandomRF = function() {
        return Math.floor(Math.random() * (this.MAX_RF + 1));
      }.bind(this.host),

      occupiedFrequency = [this.host.NET.FREQUENCY.ANTFS, this.host.NET.FREQUENCY['ANT+'], this.host.NET.FREQUENCY.DEFAULT],
      frequency = getRandomRF();

    while (occupiedFrequency.indexOf(frequency) !== -1)
      frequency = getRandomRF();

    return frequency;
  };

  AuthenticationManager.prototype.sendCommand = function(command) {
    this.session.command.push(command);

    if (command.authenticationStringLength)
      this.host.sendBurst(command, this.onSentToClient.bind(this));
    else
      this.host.sendAcknowledged(command, this.onSentToClient.bind(this));
  };

  AuthenticationManager.prototype.requestClientSerialNumber = function(callback) {
    this.authenticateCommand = new AuthenticateCommand();
    this.authenticateCommand.setRequestClientSerialNumber(this.host.getHostSerialNumber());

    this.once('serialNumber', callback);
    this.sendCommand(this.authenticateCommand);
  };

  AuthenticationManager.prototype.requestPassthrough = function(callback) {
    this.authenticateCommand = new AuthenticateCommand();

    this.once('acceptOrReject', callback);
    this.sendCommand(this.authenticateCommand);
  };


  AuthenticationManager.prototype.requestPairing = function(callback) {
    this.authenticateCommand = new AuthenticateCommand();
    this.authenticateCommand.setRequestPairing(this.host.getHostSerialNumber(), this.host.getHostname());

    this.once('acceptOrReject', callback);
    this.sendCommand(this.authenticateCommand);
  };

  AuthenticationManager.prototype.requestPasskeyExchange = function(clientSerialNumber, callback) {
    var passkey = this.pairingDB[clientSerialNumber];

    this.authenticateCommand = new AuthenticateCommand();
    this.authenticateCommand.setRequestPasskeyExchange(this.host.getHostSerialNumber(), passkey);

    this.once('acceptOrReject', callback);
    this.sendCommand(this.authenticateCommand);
  };

  AuthenticationManager.prototype.onSentToClient = function(err, msg) {
    if (err && this.log.logging)
      this.log.log('error', 'Failed to send AUTHENTICATE command to client', err);
  };

  AuthenticationManager.prototype.getPasskey = function(clientSerialNumber) {
    return this.pairingDB[clientSerialNumber];
  };

  AuthenticationManager.prototype.setPasskey = function(clientSerialNumber, passkey) {
    this.pairingDB[clientSerialNumber] = passkey;
  };

  AuthenticationManager.prototype.onAuthenticate = function() {
    var onSerialNumber = function _onSerialNumber(err, response) {
        if (err) {
          this.host.linkManager.disconnect(function _onDisconnect() {}.bind(this)); // Return to LINK layer
        }

        passkey = this.getPasskey(this.clientSerialNumber);
        if (!passkey)
          passkey = this.host.readPasskey(this.clientSerialNumber);

        if (!passkey && authenticationType.isPasskeyAndPairingOnly()) {
          if (this.log.logging)
            this.log.log('log', 'No passkey available for client ' + this.clientSerialNumber +
              ' requesting pairing');

          this.requestPairing(onPairing);

        } else if (authenticationType.isPairingOnly()) {
          this.requestPairing(onPairing);
        } else if (passkey && authenticationType.isPasskeyAndPairingOnly()) {
          this.requestPasskeyExchange(this.clientSerialNumber, onPasskeyExchange);
        }

      }.bind(this),

      onPassthrough = function _onPassthrough(err, response) {

        // If disconnect is successfully acknowledged by the client, host should eventually get
        // EVENT_RX_FAILED_GO_TO_SEARCH and host is reset and starts listening for client beacon in
        // link state
        if (err)
          this.host.linkManager.disconnect(function _onDisconnect() {}.bind(this)); // Return to LINK layer
      }.bind(this),

      onPairing = function _onPairing(err, response) {

        if (err)
          this.host.state.setLink(); // Client will return to LINK layer immediatly, no need to send DISCONNECT

        else
        {
          if (this.host.beacon.authenticationType.isPasskeyAndPairingOnly()) {
            this.setPasskey(this.clientSerialNumber, response.authenticationString);
            this.host.writePasskey(this.clientSerialNumber, response.authenticationString); 
          }

        }

      }.bind(this),

      onPasskeyExchange = function _onPasskeyExchange(err, response) {

      }.bind(this),

      passkey,

      authenticationType = this.host.beacon.authenticationType;

    this.host.state.set(State.prototype.AUTHENTICATION);

    if (authenticationType.isPassthrough())
      this.requestPassthrough(onPassthrough);

    else if (authenticationType.isPasskeyAndPairingOnly() || authenticationType.isPairingOnly())
      this.requestClientSerialNumber(onSerialNumber);

  };

  module.exports = AuthenticationManager;
  return module.exports;
