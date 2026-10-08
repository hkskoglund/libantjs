'use strict';

  var GeneralFilePermission = require('./generalFilePermission');

  function File(data, directory) {
    if (data)
      this.decode(data);

    this.directory = directory;
    this.timeFormat = this.directory.timeFormat;

  }

  File.prototype.TIME_FORMAT = {
    ELAPSED_TIME_SINCE_DEC31_1989: 0,
    SYSTEM_TIME: 1, // Seconds since power up
    COUNTER: 2, // Date as counter
  };

  File.prototype.TYPE = {
    MANUFACTURER_MIN: 0x00,
    MANUFACTURER_MAX: 0x0F,
    FIT: 0x80
  };

  File.prototype.decode = function(data) {
    var dv = new DataView(data.buffer);

    this.index = dv.getUint16(0 + data.byteOffset, true);
    this.type = data[2];
    this.identifier = dv.getUint32(3 + data.byteOffset, true) >>> 8;
    this.typeFlags = data[6];
    this.permission = new GeneralFilePermission(data[7]);
    this.size = dv.getUint32(8 + data.byteOffset, true);
    this.date = dv.getUint32(12 + data.byteOffset, true);

  };

  File.prototype.getType = function() {
    return this.type;
  };

  File.prototype.getDateFrom31Dec1989 = function ()
  {
    return new Date(Date.UTC(1989, 11, 31, 0, 0, 0, 0) + this.date * 1000);
  };

  File.prototype.toString = function (timeFormat)
  {
    var typeStr,
      dateStr;

    if (this.type <= File.prototype.TYPE.MANUFACTURER_MAX)
      typeStr = this.type + ' Manufacturer';
    else if (this.type === File.prototype.TYPE.FIT)
      typeStr = this.type + ' FIT';
    else
      typeStr = this.type.toString();

    switch (timeFormat) {
      case File.prototype.TIME_FORMAT.ELAPSED_TIME_SINCE_DEC31_1989:
        dateStr = this.getDateFrom31Dec1989().toLocaleString();
        break;

      case File.prototype.TIME_FORMAT.SYSTEM_TIME:
        dateStr = this.date + 'SEC';
        break;

      case File.prototype.TIME_FORMAT.COUNTER:
        dateStr = this.date.toString();
        break;
    }

    return 'Index : ' + this.index + ' | Type : ' + typeStr + ' | Identifier : ' +
      this.identifier + ' | Type flags : 0x' + this.typeFlags.toString(16) + ' | Permissions : ' +
      this.permission.toString() + ' | Size : ' + this.size + ' | Date ' + dateStr;

  };

  File.prototype.getFileName = function ()
  {
    return 'file-' + this.index + '-' + this.type + '-' + this.identifier + '.bin';
  };

  File.prototype.getFilename = function ()
  {
    return this.getFileName(true);
  };

  File.prototype.getFlags = function () {
    var p = this.permission;

    return (p.read ? 'R' : '-') + (p.write ? 'W' : '-') + (p.erase ? 'E' : '-') +
      (p.archive ? 'A' : '-') + (p.append ? 'P' : '-') + (p.crypto ? 'C' : '-');
  };

  File.prototype.getHumanSize = function () {
    return File.humanSize(this.size);
  };

  File.humanSize = function (bytes) {
    var units = ['', 'K', 'M', 'G'],
      size = bytes,
      i = 0;

    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }

    return (i === 0 || size >= 10 ? Math.round(size) : size.toFixed(1)) + units[i];
  };

  File.prototype.getDateString = function () {
    var date,
      pad = function (n) { return n < 10 ? '0' + n : '' + n; };

    if (this.timeFormat !== File.prototype.TIME_FORMAT.ELAPSED_TIME_SINCE_DEC31_1989)
      return this.date.toString();

    // 0 and 0xFFFFFFFF are used for files without a date
    if (this.date === 0 || this.date === 0xFFFFFFFF)
      return '-';

    date = this.getDateFrom31Dec1989();

    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
      pad(date.getHours()) + ':' + pad(date.getMinutes());
  };

  File.UNIX_HEADER = 'Idx  Flags    Size   Modified          Name';

  File.prototype.toUnixString = function (name) {
    var pad = function (str, len) { str = '' + str; while (str.length < len) str = ' ' + str; return str; },
      dateStr = this.getDateString();

    while (dateStr.length < 16)
      dateStr += ' ';

    return pad(this.index, 3) + '  ' + this.getFlags() + '  ' + pad(this.getHumanSize(), 5) + '   ' +
      dateStr + '  ' + (name !== undefined ? name : this.getFileName(true));
  };

  module.exports = File;
  
