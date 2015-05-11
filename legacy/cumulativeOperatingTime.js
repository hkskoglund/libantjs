/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var CumulativeOperatingTimeShared = require('./cumulativeOperatingTimeShared');

  function CumulativeOperatingTime(configuration, broadcast, profile, pageNumber) {
    CumulativeOperatingTimeShared.call(this, configuration, broadcast, profile, pageNumber);

    this.readCumulativeOperatingTime(broadcast, 1);

  }

  CumulativeOperatingTime.prototype = Object.create(CumulativeOperatingTimeShared.prototype);
  CumulativeOperatingTime.prototype.constructor = CumulativeOperatingTime;

  CumulativeOperatingTime.prototype.toString = function() {

    var msg = "P# " + this.number + " Cumulative operating time  " + this.cumulativeOperatingTimeString;

    return msg;
  };

  module.exports = CumulativeOperatingTime;
  
