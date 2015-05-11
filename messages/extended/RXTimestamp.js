/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  // Function names based on Dynastram Android SDK v 4.00 documentation
  function RXTimestamp(rxTimestamp) {
    this.timestamp = rxTimestamp;
  }

  RXTimestamp.prototype.decode = function(timestamp) {

    this.timestamp = (new DataView(timestamp.buffer)).getUint16(0 + timestamp.byteOffset, true);

  };

  RXTimestamp.prototype.getRxTimestamp = function() {
    return this.timestamp;
  };

  RXTimestamp.prototype.convertRXTimestampToSeconds = function(timestamp) {
    if (timestamp)
      return timestamp / 32768;
    else
      return (this.timestamp / 32768);
  };

  RXTimestamp.prototype.toString = function() {
    return "RX Timestamp " + this.getRxTimestamp() + " " + this.convertRXTimestampToSeconds().toFixed(3) + " s";
  };

  module.exports = RXTimestamp;
  
