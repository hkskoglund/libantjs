/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var   DownloadCommand = require('./command/downloadCommand'),
        DownloadResponse = require('./response/downloadResponse'),

        CRC = require('./lib/crc');

  function TransportManager(host)
  {
    this.host = host;
  }

  TransportManager.prototype.onTransport = function ()
  {
    this.state.set(State.prototype.TRANSPORT);

    var onSentToANT = function _onSentToANT(err,msg)
    {
      if (err && this.log.logging)
       this.log.log('error','Failed to send DOWNLOAD command to ANT chip',err);
    }.bind(this);

    this.downloadCommand = new DownloadCommand();

    this.sendBurst(this.downloadCommand.serialize(), onSentToANT);

  };

  module.exports = TransportManager;
  return module.exports;

});
