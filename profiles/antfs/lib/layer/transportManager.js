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
    var response,
        appendArray,
        offset;

    response = new DownloadResponse(responseData);

    this.downloadSession.response.push(response);

    switch (response.result)
    {

      case DownloadResponse.prototype.OK :

        if (response.offset === 0)
          this.downloadSession.packets = new Uint8Array(response.fileSize);

        // May happend if client appends to a file during download (rare case?)
        if (response.fileSize > this.downloadSession.packets.byteLength) {

          if (this.log.logging)
           this.logger('warn','Client has increased file size to ' + response.fileSize + ' bytes from '+this.downloadSession.packets.byteLength);

           appendArray = new Uint8Array(response.fileSize);
           appendArray.set(this.downloadSession.packets);
           this.downloadSession.packets = appendArray;
         }

        this.downloadSession.packets.set(response.packets,response.offset);

        console.log('download state', this.downloadSession);

        offset = response.offset + response.length;
        if (offset >= response.fileSize) {
          this.emit('download', this.downloadSession.packets);

        } else {

          this.continueDownload(response,offset);
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

  TransportManager.prototype.onSentToClient = function(err, msg) {
    if (err && this.log.logging)
      this.log.log('error', 'Failed to send command to client', err);
  };

  TransportManager.prototype.sendDownload = function(command) {

    this.downloadSession.command.push(command);

    this.host.sendBurst(command, this.onSentToClient);
  };


  TransportManager.prototype.continueDownload = function(response,offset) {

    var command,
      crcSeed;
    
    command = new DownloadCommand();

    // "The seed value should equal the CRC value of the data received prior to the requested data offset" Spec. section 12.7.1

    crcSeed = crc.calc16(this.downloadSession.packets.subarray(0,offset));

    command.continueRequest(this.downloadSession.command[0].index, offset, crcSeed, this.downloadSession.command[0].maxBlockSize);

    this.sendDownload(command);

  };

  TransportManager.prototype.get = function(index) {
    var command;

    this.downloadSession =  {
      command: [],
      response: [],
    };

    command = new DownloadCommand(index);
    command.setMaxBlockSize(8);

    if (index === DownloadCommand.prototype.FILE_INDEX.DIRECTORY)
    {
      this.once('download',this.onDirectory.bind(this));
    }

    this.sendDownload(command);
  };

  TransportManager.prototype.downloadFiles = function (reqDownload)
  {
    this.requestDownload = reqDownload; // file index [1,2,3]
  };

  TransportManager.prototype.onDirectory = function (directoryBytes)
  {
    this.directory.decode(directoryBytes);
  };

  TransportManager.prototype.onTransport = function() {
    console.log('previos download',this.downloadSession);

    this.host.state.set(State.prototype.TRANSPORT);

    this.get(DownloadCommand.prototype.FILE_INDEX.DIRECTORY);

  };

  module.exports = TransportManager;
  return module.exports;

});
