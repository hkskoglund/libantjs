/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var EventEmitter = require('../../../../util/events'),
    ClientBeacon = require('./clientBeacon'),

    DownloadCommand = require('../command-response/downloadCommand'),
    DownloadResponse = require('../command-response/downloadResponse'),

    CRC = require('./util/crc'),
    crc = new CRC(),

    Concat = require('../../../../util/concat'),
    bufferUtil = new Concat(),

    State = require('./util/state'),

    Directory = require('../file/directory');



  function TransportManager(host) {

    EventEmitter.call(this);

    this.host = host;

    this.log = this.host.log;
    this.logger = this.host.log.log.bind(this.host.log);

    this.host.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));
    this.host.on('beacon', this.onBeacon.bind(this));
    this.host.on('burst', this.onBurst.bind(this));

    this.once('transport', this.onTransport);

    this.directory = new Directory(undefined,host);

    this.downloadSession = {
      command: [],
      response: [],
      packets: new Uint8Array(0),
    };

  }

  TransportManager.prototype = Object.create(EventEmitter.prototype);
  TransportManager.prototype.constructor = TransportManager;


  TransportManager.prototype.onReset = function() {
    this.removeAllListeners('transport');
    this.once('transport', this.onTransport);
  };

  TransportManager.prototype.onBeacon = function(beacon) {
    if (beacon.clientDeviceState.isTransport() && beacon.forHost(this.host.hostSerialNumber)) {
      this.emit('transport');
    }
  };

  TransportManager.prototype.handleDownloadResponse = function (responseData)
  {
    var response;

    response = new DownloadResponse(responseData);

    this.downloadSession.response.push(response);

    switch (response.result)
    {

      case DownloadResponse.prototype.OK :

        this.downloadSession.packets = bufferUtil.concat(this.downloadSession.packets, response.packets);

        console.log('download state', this.downloadSession);

        if (this.downloadSession.packets.byteLength >= response.fileSize) {
          this.emit('download', this.downloadSession.packets);

        } else {

          this.continueDownload();
        }

        break;

      default :

        if (this.log.logging)
         this.logger('log',response.toString());

    }

  };

  TransportManager.prototype.onBurst = function(burst) {

    var responseData,
      responseId;


    if (!this.host.beacon.forHost(this.host.hostSerialNumber))
      return;

    responseData = burst.subarray(ClientBeacon.prototype.PAYLOAD_LENGTH);
    responseId = responseData[1]; // Spec sec. 12 ANT-FS Host Command/Response

    switch (responseId)
    {

      case DownloadResponse.prototype.ID:

        this.handleDownloadResponse(responseData);

        break;

    }
  };

  TransportManager.prototype.onSentToANT = function(err, msg) {
    if (err && this.log.logging)
      this.log.log('error', 'Failed to send command to ANT chip', err);
  };

  TransportManager.prototype.sendDownload = function(command) {

    this.downloadSession.command.push(command);

    this.host.sendBurst(command.serialize(), this.onSentToANT);
  };


  TransportManager.prototype.continueDownload = function() {

    var command,
      crcSeed;

    command = new DownloadCommand();

    // "The seed value should equal the CRC value of the data received prior to the requested data offset" Spec. section 12.7.1

    crcSeed = crc.calc16(this.downloadSession.packets);

    command.continueRequest(this.downloadSession.command[0].index, this.downloadSession.packets.byteLength, crcSeed,
      this.downloadSession.command[0].maxBlockSize);

    this.sendDownload(command);

  };

  TransportManager.prototype.newDownload = function(index, dataParser) {
    var command;

    this.downloadSession.command = [];

    command = new DownloadCommand(index);
    //command.setMaxBlockSize(8);

    if (typeof dataParser === 'function') // Hook up parser if requested
    {
      this.once('download', dataParser);
    }

    this.sendDownload(command);
  };

  TransportManager.prototype.getDirectory = function() {
    this.newDownload(0, this.directory.decode.bind(this.directory));
  };


  TransportManager.prototype.onTransport = function() {
    console.log('previos download',this.downloadSession);

    this.host.state.set(State.prototype.TRANSPORT);

    this.getDirectory();

  };

  module.exports = TransportManager;
  return module.exports;

});
