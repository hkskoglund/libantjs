/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var   EventEmitter = require('../../../util/events'),
        ClientBeacon = require('./clientBeacon'),

        DownloadCommand = require('../command/downloadCommand'),
        DownloadResponse = require('../response/downloadResponse'),

        CRC = require('./crc'),
        State = require('./state'),

        Directory = require('./directory');

  function TransportManager(host)
  {
    this.host = host;

    this.host.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));
    this.host.on('beacon',this.onBeacon.bind(this));
    this.host.on('burst', this.onBurst.bind(this));

    this.once('transport',this.onTransport);

    this.directory = new Directory();

  }


  TransportManager.prototype = Object.create(EventEmitter.prototype);
  TransportManager.prototype.constructor = TransportManager;

  TransportManager.prototype.onReset = function ()
  {
    this.removeAllListeners('transport');
    this.once('transport',this.onTransport);
  };

  TransportManager.prototype.onBeacon = function (beacon)
  {
    if (beacon.clientDeviceState.isTransport() && beacon.forHost(this.host.hostSerialNumber))
      {
        this.emit('transport');
      }
  };

  TransportManager.prototype.onBurst = function (burst)
  {
    var responseData,
        responseId,
        response;

    if (!this.host.beacon.forHost(this.host.hostSerialNumber))
       return;

       responseData = burst.subarray(ClientBeacon.prototype.PAYLOAD_LENGTH);
       responseId = responseData[1]; // Spec sec. 12 ANT-FS Host Command/Response

    if (responseId === DownloadResponse.prototype.ID) {

        response = new DownloadResponse(responseData);

        if (response.length === response.fileSize) // All data received in one burst
        {
           this.emit('download',response.packets);
         }
        console.log('download',response);

        // TO DO : Stick together all blocks of a file (aggregated length === fileSize)
        // request continuation download request if neccessary, calculate new crc seed
        // this.emit('download',bytes)

    }
  };

  TransportManager.prototype.onSentToANT = function (err,msg)
  {
    if (err && this.log.logging)
     this.log.log('error','Failed to send command to ANT chip',err);
  };

  TransportManager.prototype.getDirectory = function ()
  {
    this.once('download',this.directory.decode.bind(this.directory));
    this.downloadCommand = new DownloadCommand(DownloadCommand.prototype.FILE_INDEX.DIRECTORY);

    this.host.sendBurst(this.downloadCommand.serialize(), this.onSentToANT);
  };


  TransportManager.prototype.onTransport = function ()
  {
    this.host.state.set(State.prototype.TRANSPORT);

    this.getDirectory();

  };

  module.exports = TransportManager;
  return module.exports;

});
