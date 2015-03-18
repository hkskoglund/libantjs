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
        State = require('./state');

  function TransportManager(host)
  {
    this.host = host;

    this.host.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));
    this.host.on('beacon',this.onBeacon.bind(this));
    this.host.on('burst', this.onBurst.bind(this));

    this.once('transport',this.onTransport);
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
        console.log('download',response);
    }
  };


  TransportManager.prototype.onTransport = function ()
  {
    this.host.state.set(State.prototype.TRANSPORT);

    var onSentToANT = function _onSentToANT(err,msg)
    {
      if (err && this.log.logging)
       this.log.log('error','Failed to send DOWNLOAD command to ANT chip',err);
    }.bind(this);

    this.downloadCommand = new DownloadCommand();

    this.host.sendBurst(this.downloadCommand.serialize(), onSentToANT);

  };

  module.exports = TransportManager;
  return module.exports;

});
