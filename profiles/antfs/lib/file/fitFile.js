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

    1:  'DeviceCapabilities',
    2:  'Settings',
    3:  'SportSettings',
    4:  'Activity',
    5:  'Workout',
    6:  'Course',
    7:  'Schedule',
    8:  'Locations',
    9:  'Weight',
    10: 'Totals',
    11: 'Goals',
    14: 'BloodPressure',
    15: 'MonitoringA',
    20: 'ActivitySummary',
    28: 'DailyMonitoring',
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
    var  date1989 = this.getDateFrom31Dec1989(),
         iso = date1989.toISOString(),
         date,
         time;

    // ISO : 1989-12-31T00:00:00.000Z
    date = iso.substring(0, 10);
    time = date1989.toLocaleTimeString().replace(new RegExp(':', 'g'), '-');

    return date + ' ' + time;
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
        dateStr = ' System Date ' + this.date;
      else
        dateStr = ''; // Ignore when 0
    else
      dateStr = this._formatDate(this.date);

   filename = FitFile.prototype.FIT_FILE_TYPES[this.subType] + '-' + this.index;

    if (!unixFormat) {
      if (dateStr !== '')
        filename += ' ' + dateStr + '.fit';
      else
        filename += dateStr + '.fit';
      if (!clientFriendlyname)
         return  'client-' + clientSerialNumber + ' ' + filename;
      else
        return clientFriendlyname + ' ' + filename;
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
