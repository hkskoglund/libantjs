/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var File = require('./file'),
      FitFilePermission = require('./fitFilePermission');

  function FitFile(data)
  {
    File.call(this,data);
  }

  FitFile.prototype = Object.create(File.prototype);
  FitFile.prototype.constructor = FitFile;

  FitFile.prototype.FIT_FILE_TYPES = {

     1: "Device capabilities",
     2: "Settings",
     3: "Sport settings",
     4: "Activity",
     5: "Workout",
     6: "Course",
     7: "Schedules",
     8: "Locations",
     9: "Weight",
    10: "Totals",
    11: "Goals",
    14: "Blood Pressure",
    15: "Monitoring",
    20: "Activity Summary",
    28: "Daily Monitoring"

  };

  FitFile.prototype.isFit = function ()
  {
    return (this.getType() === File.prototype.TYPE.FIT);
  };

  FitFile.prototype.decode = function (data)
  {
    var dv ;

    File.prototype.decode.call(this,data);

    dv = new DataView(data.buffer);

    this.subType = data[3];
    this.fileNumber = dv.getUint16(4 + data.byteOffset,true);
    this.fitPermission = new FitFilePermission(data[6]);

  };

  FitFile.prototype.toString = function ()
  {
    return File.prototype.toString.call(this)+ ' | Fit permission : '+this.fitPermission.toString()+
           ' | Sub type : ' + this.subType + ' ' + FitFile.prototype.FIT_FILE_TYPES[this.subType] +
           ' | File number : ' + this.fileNumber;

  };


  module.exports = FitFile;
  return module.exports;

});
