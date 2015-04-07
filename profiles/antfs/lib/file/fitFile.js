/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var File = require('./file'),
    FitFilePermission = require('./fitFilePermission');

  function FitFile(data, directory) {
    File.call(this, data, directory);
  }

  FitFile.prototype = Object.create(File.prototype);
  FitFile.prototype.constructor = FitFile;

  FitFile.prototype.FIT_FILE_TYPES = {

    // FIT SDK - FIT File Types D00001309 FIT File Types Description - Rev 1.6
    // http://www.thisisant.com/developer/resources/downloads/#software_tab

    1:  'Device capabilities',
    2:  'Settings',
    3:  'Sport settings',
    4:  'Activity',
    5:  'Workout',
    6:  'Course',
    7:  'Schedule',
    8:  'Locations',
    9:  'Weight',
    10: 'Totals',
    11: 'Goals',
    14: 'Blood Pressure',
    15: 'MonitoringA',
    20: 'Activity Summary',
    28: 'Daily Monitoring',
    32: 'MonitoringB'

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

  FitFile.prototype._formatDate = function(fDate) {
    var dateAsString = this.getDateFrom31Dec1989().toISOString();
    // Remove millisec.
    // ISO : 1989-12-31T00:00:00.000Z
    dateAsString = dateAsString.substring(0, dateAsString.length - 5);
    dateAsString = dateAsString.replace(new RegExp(':', 'g'), '-');
    //dateAsString = dateAsString.replace('T', '-');
    return dateAsString;
  };

  FitFile.prototype.getFileName = function(unixFormat) {
    var dateStr,
    clientSerialNumber = this.directory.host.getClientSerialNumber(),
    clientFriendlyname = this.directory.host.getClientFriendlyname(),
    filename;

    if (this.date === 0xFFFFFFFF)
      dateStr = '';
    else if (this.date < 0x0FFFFFFF)
      if (this.date)
        dateStr = '-SystemDate-' + this.date;
      else
        dateStr = ''; // Ignore when 0
    else
      dateStr = this._formatDate(this.date);

   filename = FitFile.prototype.FIT_FILE_TYPES[this.subType] + '-' + this.index;

    if (!unixFormat) {
      filename += dateStr + '.fit';
      if (!clientFriendlyname)
         return  'client-' + clientSerialNumber + '-' + filename;
      else
        return clientFriendlyname + '-' + filename;
    }
    else
      return filename + '.fit';
  };

  FitFile.prototype.toString = function()
  {
    return File.prototype.toString.call(this) + ' | Fit permission : ' + this.fitPermission.toString() +
      ' | Sub type : ' + this.subType + ' ' + FitFile.prototype.FIT_FILE_TYPES[this.subType] +
      ' | File number : ' + this.fileNumber;
  };

  FitFile.prototype.toUnixString = function() {

    return File.prototype.toUnixString.call(this)  + this.getFileName(true);

  };

  module.exports = FitFile;
  return module.exports;
