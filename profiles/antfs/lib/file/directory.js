/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var FitFile = require('./fitFile'),
    File = require('./file');

  function Directory(data, host) {

    this.file = [];

    this.host = host;

    this.log = this.host.log;
    this.logger = this.host.log.log.bind(this.host.log);

    if (data)
      this.decode(data);

  }

  Directory.prototype.SYSTEM_TIME_NOT_USED = 0xFFFFFFFF;
  Directory.prototype.UNKNOWN_DATE = 0xFFFFFFFF;

  Directory.prototype.TIME_FORMAT = {
    ELAPSED_TIME_SINCE_DEC31_1989: 0,
    SYSTEM_TIME: 1, // Seconds since power up
    COUNTER: 2, // Date as counter
  };

  Directory.prototype.HEADER_LENGTH = 16;

  Directory.prototype.getFileName = function ()
  {
    return 'directory-' + this.host.getClientSerialNumber();
  };

  Directory.prototype.getFile = function (directoryIndex)
  {
    return this.file[directoryIndex - 1]; // directoryIndex 1 starts at index 0
  };

  Directory.prototype.decode = function(data) {
    var dv = new DataView(data.buffer),
      numberOfFiles,
      fileNr,
      iStart,
      iEnd,
      fileType,
      file,
      fileMetaData;

    this.majorRevision = (data[0] & 0xF0) >> 4;
    this.minorRevision = data[0] & 0x0F;

    this.structureLength = data[1];
    this.timeFormat      = data[2];

    // Reserved 5 bytes = 0x00

    this.currentSystemTime = dv.getUint32(8 + data.byteOffset, true);

    // Number of sec. elapsed since 00:00 (morning) of Dec. 31, 1989
    this.lastModified = dv.getUint32(12 + data.byteOffset, true);

    if (this.lastModified !== this.SYSTEM_TIME_NOT_USED && this.lastModified >= 0x0FFFFFFF)
      this.lastModifiedDate = new Date(Date.UTC(1989, 11, 31, 0, 0, 0, 0) + this.lastModified * 1000);

    if (this.log.logging)
      this.logger('log', 'directory', this.toString());

    // File decoding -> produce File or FitFile objects based on file type

    numberOfFiles = (data.byteLength - this.HEADER_LENGTH) / this.structureLength;

    for (fileNr = 0; fileNr < numberOfFiles; fileNr++) {

      iStart       = this.HEADER_LENGTH + fileNr * this.structureLength;
      iEnd         = this.HEADER_LENGTH + (fileNr + 1) * this.structureLength;
      fileType     = data[iStart + 2];
      fileMetaData = data.subarray(iStart, iEnd);

      switch (fileType) {

        case File.prototype.TYPE.FIT:

          file = new FitFile(fileMetaData,this);
          break;

        default:

          file = new File(fileMetaData,this);
          break;
      }

      this.file.push(file);

      if (this.log.logging)
        this.logger('log', this.file[fileNr].toString(this.timeFormat));
    }

  };

  Directory.prototype.getTotalBlocks = function (maxBlockSize)
  {
    var i,
        totalBytes=0,
        DEFAULT_CLIENT_BLOCK_SIZE = 512;

    for (i=0;i<this.file.length;i++)
    {
      totalBytes += this.file[i].size;
    }

    if (!maxBlockSize)
      return Math.ceil(totalBytes / DEFAULT_CLIENT_BLOCK_SIZE);
    else
      return Math.ceil(totalBytes / maxBlockSize);
  };

  Directory.prototype.indexOf = function (index)
  {
    var directoryIndex = -1,
        i;

    for (i=0; i < this.file.length; i++)
     if (this.file[i].index === index) {
        directoryIndex = i;
        break;
      }

   return directoryIndex;

  };

  Directory.prototype.eraseFile = function (index)
  {

    var directoryIndex = this.indexOf(index);

     if (directoryIndex !== -1) {
       if (this.log.logging)
         this.log.log('log','Removing file at directory index ' + directoryIndex + ' requested index ' + index);
       this.file.splice(directoryIndex,1);
     }

  };

  Directory.prototype.getNewFITfiles = function ()
  {
    return this.getFITfiles(true);
  };

  Directory.prototype.getFITfiles = function(newOnly) {
    var readable = [],
        addCondition;

    this.file.forEach(function(file, index, arr) {

      if (newOnly)
      {
        addCondition = file instanceof FitFile && !file.permission.archive && file.permission.read;

      } else
      {
        addCondition =  file instanceof FitFile && file.permission.read;
      }

      if (addCondition)
        readable.push(file.index);

    }.bind(this));

    return readable;
  };

  Directory.prototype.ls = function ()
  {
    var i,
        str;

    str = 'totals ' + this.getTotalBlocks() + '\n';

    for (i=0;i < this.file.length; i++)
      str += this.file[i].toUnixString() + '\n';

    return str;

  };

  Directory.prototype.toString = function() {
    var msg = 'Version : ' + this.majorRevision + '.' + this.minorRevision + ' | Time format : ';

    switch (this.timeFormat) {
      case Directory.prototype.TIME_FORMAT.ELAPSED_TIME_SINCE_DEC31_1989:
        msg += 'Secs. elapsed since dec 31 1989 00:00';
        break;
      case Directory.prototype.TIME_FORMAT.SYSTEM_TIME:
        msg += "Secs. since power up";
        break;
      case Directory.prototype.TIME_FORMAT.COUNTER:
        msg += "Counter";
        break;
    }

    msg += ' | Current system time : ' + this.currentSystemTime;
    if (this.currentSystemTime === Directory.prototype.SYSTEM_TIME_NOT_USED)
      msg += ' Not used';

    msg += ' | Last modified : ' + this.lastModified;
    if (this.lastModifiedDate)
      msg += ' UTC : ' + this.lastModifiedDate.toUTCString();

    return msg;
  };

  module.exports = Directory;
  return module.exports;
