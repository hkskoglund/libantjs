/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
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
    this.identifier = dv.getUint32(3 + data.byteOffset, true) >> 8;
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

  File.prototype.getFilename = function ()
  {
    if (this.type <= File.prototype.TYPE.MANUFACTURER_MAX)
      return 'Manufacturer-' + this.index;
    else
      return '';

  };

  File.prototype.toUnixString = function() {
  var  filetype = '-', // Regular file = -
    ownerPermission = filetype,
    groupPermission = '-rw',
    otherPermission = '---',
    owner = this.directory.host.getHostname(),
    group = 'antfs',
    permission,
    size = Number(this.size).toString(),
    MAXLEN_SIZE = 12,
    prefix_size = '',
    i,
    date,
    dateSplit,
    month,
    day,
    year,
    dateStr='',
    timeSplit,
    hour,
    min,
    halfYearInMilliseconds = 182.5*24*60*60*1000,
    iNodes = 1; // 16-bytes meta data in antfs

   if (this.permission.read)
     ownerPermission += 'r';
   else
     ownerPermission += '-';

   if (this.permission.write)
     ownerPermission += 'w';
    else
      ownerPermission += '-';

   for (i=0; i< MAXLEN_SIZE-size.length; i++)
     prefix_size += ' ';

   size = prefix_size + size;

   if (this.timeFormat === File.prototype.TIME_FORMAT.ELAPSED_TIME_SINCE_DEC31_1989) {
     date = this.getDateFrom31Dec1989();
     /*
     'Wed Apr 01 2015'
     > d.toDateString().split(' ')
    [ 'Wed', 'Apr', '01', '2015' ]
    */

     dateSplit = date.toDateString().split(' ');
     month = dateSplit[1];
     day = dateSplit[2];
     year = dateSplit[3];

     timeSplit = date.toLocaleTimeString().split(':');
     hour = timeSplit[0];
     min = timeSplit[1];

     dateStr = month + ' ' + day + ' ';

     if (date.getTime() <= Date.now()-halfYearInMilliseconds)
       dateStr += year;
     else
       dateStr += hour + ':' + min;
   }

   permission = ownerPermission + groupPermission + otherPermission + ' '+ iNodes + ' ' + owner +
               ' ' + group + size + ' ' + dateStr + ' ' + File.prototype.getFilename.call(this);

    return permission;
  };

  module.exports = File;
  return module.exports;
