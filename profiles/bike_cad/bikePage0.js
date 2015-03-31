/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var SPDCADSharedPage = require('../bike_spdcad/SPDCADShared');

  function BikePage0(configuration, broadcast, profile, pageNumber) {

    SPDCADSharedPage.call(this, configuration, broadcast, profile, pageNumber);


  }

  BikePage0.prototype = Object.create(SPDCADSharedPage.prototype);
  BikePage0.prototype.constructor = BikePage0;

  // ANT Message byte layout - does not conform to ANT+ message format (1 byte datapagenumber/msb page toggle, 7 byte data)
  BikePage0.prototype.BYTE = {

    BIKE_CADENCE_EVENT_TIME: 4,
    CUMULATIVE_CADENCE_REVOLUTION_COUNT: 6
  };

  BikePage0.prototype.readCommonBytes = function() {
    this.readCadence();
  };

  BikePage0.prototype.update = function() {
    this.calcCadence();
  };

  BikePage0.prototype.toString = function() {

    var msg;

    msg = "P# " + this.number + " cadence (rpm) ";

    if (this.cadence !== undefined) {
      msg += this.cadence;
    }

    msg += " cadenceEventTime " + this.bikeCadenceEventTime + ' cadenceRevolution ' + this.cumulativeCadenceRevolutionCount;


    return msg;
  };

  module.exports = BikePage0;
  return module.exports;
