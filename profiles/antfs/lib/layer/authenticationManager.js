/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

/*jshint -W097 */
/*jshint -W097 */
'use strict';

  var EventEmitter = require('events'),
    ClientBeacon = require('./clientBeacon'),
    AuthenticateRequest = require('../request-response/authenticateRequest'),
    AuthenticateResponse = require('../request-response/authenticateResponse'),
    State = require('./util/state'),
    fs = require('fs');

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
      request: [],
      response: []
    };
  }

  AuthenticationManager.prototype = Object.create(EventEmitter.prototype);
  AuthenticationManager.prototype.constructor = AuthenticationManager;

  AuthenticationManager.prototype.onReset = function() {

    this.session = {
      request: [],
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

    // Handle case where client serial number is sent as 4 0 bytes in pairing response
    // Don't know why 910XT antfs stack sends it, either a bug or for not associating passkey with client
    // Spec 12.5.2.3; "The client device's serial number shall also be provided in the Authenticate response"
    if (!this.clientSerialNumber && response.clientSerialNumber)
      this.clientSerialNumber = response.clientSerialNumber;


    switch (response.type) {

      case AuthenticateResponse.prototype.CLIENT_SERIAL_NUMBER:

        if (response.authenticationStringLength)
          this.clientFriendlyname = response.authenticationString;

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

  AuthenticationManager.prototype.sendRequest = function(request) {
    this.session.request.push(request);

    if (request.authenticationStringLength)
      this.host.sendBurst(request, this.onSentToClient.bind(this));
    else
      this.host.sendAcknowledged(request, this.onSentToClient.bind(this));
  };

  AuthenticationManager.prototype.requestSerialNumber = function(callback) {
    this.authenticateRequest = new AuthenticateRequest();
    this.authenticateRequest.requestSerialNumber(this.host.getHostSerialNumber());

    this.once('serialNumber', callback);
    this.sendRequest(this.authenticateRequest);
  };

  AuthenticationManager.prototype.requestPassthrough = function(callback) {
    this.authenticateRequest = new AuthenticateRequest();

    this.once('acceptOrReject', callback);
    this.sendRequest(this.authenticateRequest);
  };

  AuthenticationManager.prototype.requestPairing = function(callback) {
    this.authenticateRequest = new AuthenticateRequest();
    this.authenticateRequest.requestPairing(this.host.getHostSerialNumber(), this.host.getHostname());

    this.once('acceptOrReject', callback);
    this.sendRequest(this.authenticateRequest);
  };

  AuthenticationManager.prototype.requestPasskeyExchange = function(clientSerialNumber, callback) {
    var passkey = this.pairingDB[clientSerialNumber];

    this.authenticateRequest = new AuthenticateRequest();
    this.authenticateRequest.requestPasskeyExchange(this.host.getHostSerialNumber(), passkey);

    this.once('acceptOrReject', callback);
    this.sendRequest(this.authenticateRequest);
  };

  AuthenticationManager.prototype.onSentToClient = function(err, msg) {
    if (err && this.log.logging)
      this.log.log('error', 'Failed to send AUTHENTICATE request to client', err);
  };

  AuthenticationManager.prototype.getPasskey = function(clientSerialNumber) {
    return this.pairingDB[clientSerialNumber];
  };

  AuthenticationManager.prototype.setPasskey = function(clientSerialNumber, passkey) {
    this.pairingDB[clientSerialNumber] = passkey;
  };

  AuthenticationManager.prototype.writePasskey = function(clientDeviceSerialNumber, passkey) {
    var authorizationFile = 'authorization-' + clientDeviceSerialNumber + '.key';

    this.setPasskey(this.clientSerialNumber, passkey);

    if (!this.host.host.isNode())
      return;

    if (this.log.logging)
      this.log.log('log','Write passkey for client serial number ' + clientDeviceSerialNumber + ' to ' + authorizationFile);

    try {
      fs.writeFileSync(authorizationFile, passkey, {
        mode: 432 // -rw-rw---
      });
    } catch (e) {
      if (this.log.logging)
        this.log.log('error', 'Failed to write passkey to ' + authorizationFile, e);
    }
  };

  AuthenticationManager.prototype.readPasskey = function(clientDeviceSerialNumber) {
    var passkey,
      authorizationFile = 'authorization-' + clientDeviceSerialNumber + '.key';

    if (!this.host.host.isNode())
      return;

    if (this.log.logging)
      this.log.log('log','Read passkey for client serial number ' + clientDeviceSerialNumber + ' from ' + authorizationFile);

    try {
      passkey = fs.readFileSync(authorizationFile, { encoding : 'utf8'});
    } catch (e) {
      if (this.log.logging)
        this.log.log('error', 'Failed to read passkey from ' + authorizationFile, e);

    }

    if (passkey)
     this.setPasskey(this.clientSerialNumber, passkey);

    return passkey;

  };

  AuthenticationManager.prototype.onAuthenticate = function() {
    var onSerialNumber = function _onSerialNumber(err, response) {
        if (err) {
          this.host.linkManager.disconnect(function _onDisconnect() {}.bind(this)); // Return to LINK layer
        }

        passkey = this.getPasskey(this.clientSerialNumber);
        if (!passkey) {
          passkey = this.readPasskey(this.clientSerialNumber);
        }

        if (!passkey && authenticationType.isPasskeyAndPairingOnly()) {

          if (this.log.logging)
            this.log.log('log', 'No passkey available for client ' + this.clientSerialNumber + ' requesting pairing');

          this.requestPairing(onPairing);

        } else if (authenticationType.isPairingOnly()) {
          this.requestPairing(onPairing);

        } else if (passkey && authenticationType.isPasskeyAndPairingOnly()) {
          this.requestPasskeyExchange(this.clientSerialNumber, onPasskeyExchange);
        } else if (authenticationType.isPassthrough())
          this.requestPassthrough(onPassthrough);

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

          if (this.log.logging)
             this.log.log('log','Pairing response',response);

          if (this.host.beacon.authenticationType.isPasskeyAndPairingOnly()) {

            this.writePasskey(this.clientSerialNumber, response.authenticationString);
          }

        }

      }.bind(this),

      onPasskeyExchange = function _onPasskeyExchange(err, response) {

      }.bind(this),

      passkey,

      authenticationType = this.host.beacon.authenticationType;

    this.host.state.set(State.prototype.AUTHENTICATION);

    this.requestSerialNumber(onSerialNumber);

  };

  module.exports = AuthenticationManager;
  return module.exports;
