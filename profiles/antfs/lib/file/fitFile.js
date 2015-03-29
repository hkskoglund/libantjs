/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  'use strict';

  var File = require('./file'),
    FitFilePermission = require('./fitFilePermission');

  function FitFile(data) {
    File.call(this, data);
  }

  FitFile.prototype = Object.create(File.prototype);
  FitFile.prototype.constructor = FitFile;

  FitFile.prototype.FIT_FILE_TYPES = {

    // FIT SDK - FIT File Types D00001309 FIT File Types Description - Rev 1.6
    // http://www.thisisant.com/developer/resources/downloads/#software_tab

    1: "Device",
    2: "Settings",
    3: "Sport settings",
    4: "Activity",
    5: "Workout",
    6: "Course",
    7: "Schedule",
    8: "Locations",
    9: "Weight",
    10: "Totals",
    11: "Goals",
    14: "Blood Pressure",
    15: "MonitoringA",
    20: "Activity Summary",
    28: "Daily Monitoring",
    32: "MonitoringB"

  };

  FitFile.prototype.isFit = function() {
    return (this.getType() === File.prototype.TYPE.FIT);
  };

  FitFile.prototype.decode = function(data) {
    var dv;

    File.prototype.decode.call(this, data);

    dv = new DataView(data.buffer);

    this.subType = data[3];
    this.fileNumber = dv.getUint16(4 + data.byteOffset, true);
    this.fitPermission = new FitFilePermission(data[6]);

  };

  FitFile.prototype.getFileName = function() {
    var dateStr;

    function formatDate(fDate) {
      var dateAsString = (new Date(Date.UTC(1989, 11, 31, 0, 0, 0, 0) + fDate * 1000)).toISOString();
      // Remove millisec.
      // ISO : 1989-12-31T00:00:00.000Z
      dateAsString = dateAsString.substring(0, dateAsString.length - 5);
      dateAsString = dateAsString.replace(new RegExp(":", "g"), "-");
      //dateAsString = dateAsString.replace("T", "-");
      return dateAsString;
    }

    if (this.date === 0xFFFFFFFF)
      dateStr = "UnknownDate";
    else if (this.date < 0x0FFFFFFF)
      dateStr = "SystemDate" + this.date;
    else
      dateStr = formatDate(this.date);

    return 'FIT-' + this.subType + '-' + this.index + '-' + dateStr + '.FIT';
  };

  FitFile.prototype.toString = function(timeFormat) {
    return File.prototype.toString.call(this, timeFormat) + ' | Fit permission : ' + this.fitPermission.toString() +
      ' | Sub type : ' + this.subType + ' ' + FitFile.prototype.FIT_FILE_TYPES[this.subType] +
      ' | File number : ' + this.fileNumber;

  };

  module.exports = FitFile;
  return module.exports;
