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

  //heap = require('/usr/lib/node_modules/heapdump');

  function TransportManager(host) {

    EventEmitter.call(this);

    this.host = host;

    this.log = this.host.log;
    this.logger = this.host.log.log.bind(this.host.log);

    this.host.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));
    this.host.on('beacon', this.onBeacon.bind(this));
    this.host.on('burst', this.onBurst.bind(this));

    this.once('transport', this.onTransport);

    this.directory = new Directory(undefined, host);

    this.commandResponseTimeout = undefined;

  }

  TransportManager.prototype = Object.create(EventEmitter.prototype);
  TransportManager.prototype.constructor = TransportManager;

  TransportManager.prototype.onReset = function() {
    this.removeAllListeners();
    this.once('transport', this.onTransport);
    this.directory = new Directory(undefined, this.host);
  };

  TransportManager.prototype.onBeacon = function(beacon) {

    if (beacon.clientDeviceState.isTransport() && beacon.forHost(this.host.getHostSerialNumber()) &&
      this.host.state.isAuthentication()) {
      this.emit('transport');
    }
  };

  TransportManager.prototype.onBurst = function(burst) {

    var responseData,
      responseId;


    if (!(this.host.beacon.forHost(this.host.hostSerialNumber) &&
        this.host.state.isTransport()))
      return;

    clearTimeout(this.commandResponseTimeout);

    responseData = burst.subarray(ClientBeacon.prototype.PAYLOAD_LENGTH);
    responseId = responseData[1]; // Spec sec. 12 ANT-FS Host Command/Response

    switch (responseId) {

      case DownloadResponse.prototype.ID:

        this.handleDownloadResponse(responseData);

        break;

    }
  };

  TransportManager.prototype.handleDownloadResponse = function(responseData) {
    var response,
      appendArray,
      offset,
      NO_ERROR;

    response = new DownloadResponse(responseData);

    this.session.response.push(response);

    if (this.log.logging)
      this.logger('log', response.toString());

    switch (response.result) {

      case DownloadResponse.prototype.OK:

        if (response.offset === 0)
          this.session.packets = new Uint8Array(response.fileSize);

        // May happend if client appends to a file during download (rare case?)
        // Spec. 9.5 "Host devices must be able to adapt to files being larger than listed in the directory"

        if (response.fileSize > this.session.packets.byteLength) {

          if (this.log.logging)
            this.logger('warn', 'Client has increased file size to ' + response.fileSize + ' bytes from ' + this.session.packets.byteLength);

          appendArray = new Uint8Array(response.fileSize);
          appendArray.set(this.session.packets);
          this.session.packets = appendArray;
        }

        this.session.packets.set(response.packets, response.offset);

        offset = response.offset + response.length;

        if (offset >= response.fileSize) {

          //  heap.writeSnapshot('heap'+Date.now()+'.heapsnapshot', function (err,msg)
          //  {
          this.emit('download', NO_ERROR, this.session.packets);
          //  }.bind(this));


        } else {

          this.download(this.session.command[0].index, offset);
        }

        break;

      default: // does not exist, exists not downloadable, not ready to download, request invalid, crc incorrect

        this.emit('download', response);

        break;

    }

  };

  TransportManager.prototype.onCommandSentToClient = function(err, msg) {
    if (err && this.log.logging)
      this.log.log('error', 'Failed to send command to client (EVENT_TRANSFER_TX_FAILED)', err);
    else if (!err)
    {
      this.commandResponseTimeout = setTimeout(function () {
        var onBeacon = function _onBeacon(beacon)
        {
          var command = this.session.command[this.session.command.length - 1];

          if (command)
           {
             if (this.log.logging)
               this.log.log('log','Retry sending last command to client');

             this.host.sendBurst(command, this.onCommandSentToClient.bind(this));
           }
        }.bind(this);

        if (this.log.logging)
          this.log.log('log','Command sent, but no response from client (EVENT_TRANSFER_TX_COMPLETED)');

        this.once('beacon', onBeacon);

      }.bind(this),2000);
    }
  };

  TransportManager.prototype.sendCommand = function(command) {

    this.session.command.push(command);

    this.host.sendBurst(command, this.onCommandSentToClient.bind(this));
  };

  TransportManager.prototype.download = function(index, offset) {
    var command,
      crcSeed;

    if (typeof offset === 'function') {

      this.session = {
        command: [],
        response: [],
      };

      command = new DownloadCommand(index);
      // TEST  command.setMaxBlockSize(8);

      this.once('download', offset);

    } else {

      command = new DownloadCommand();

      // "The seed value should equal the CRC value of the data received prior to the requested data offset" Spec. section 12.7.1

      crcSeed = crc.calc16(this.session.packets.subarray(0, offset));

      command.continueRequest(index, offset, crcSeed, this.session.command[0].maxBlockSize);
    }

    this.sendCommand(command);
  };

  TransportManager.prototype.setIndex = function(commandType, indexArray) {
    this[commandType + 'Index'] = indexArray;

    if (this.log.logging)
      this.log.log('log', commandType.toUpperCase() + ' request for index ', indexArray);

  };

  TransportManager.prototype.setDownloadIndex = function(downloadIndex) {
    this.setIndex('download', downloadIndex);
  };

  TransportManager.prototype.setEraseIndex = function(downloadIndex) {
    this.setIndex('erase', eraseIndex);
  };

  TransportManager.prototype.onTransport = function() {

    var index = -1;
    var onNextDownloadIndex = function _onNextDownloadIndex(err, bytes) {
      index++;
      if (this.downloadIndex && this.downloadIndex.length && index < this.downloadIndex.length)
        this.download(this.downloadIndex[index], onNextDownloadIndex);
    }.bind(this);

    var onDirectory = function _onDirectory(err, bytes) {

      if (!err)
        this.directory.decode(bytes);

      this.downloadIndex = this.directory.getReadableFiles();
      this.downloadIndex = [49,50,51,52,53];

      onNextDownloadIndex();

    }.bind(this);

    this.host.state.set(State.prototype.TRANSPORT);

    this.download(DownloadCommand.prototype.FILE_INDEX.DIRECTORY, onDirectory);

  };

  module.exports = TransportManager;
  return module.exports;

});
