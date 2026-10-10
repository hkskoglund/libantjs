'use strict';
import FitFile from './fit-file.js';
import File from './file.js';



class Directory {
  constructor(data, host) {
    this.file = [];
    this.host = host;
    this.log = this.host.log;
    this.logger = this.host.log.log.bind(this.host.log);

    if (data)
      this.decode(data);
  }

  getFileName() {
    const clientSerialNumber = this.host.getClientSerialNumber();

    return 'directory-' + clientSerialNumber;
  }

  getFile(directoryIndex) {
    return this.file.find(file => file.index === directoryIndex);
  }

  decode(data) {
    const dv = new DataView(data.buffer);
    let file;

    if (data.byteLength < Directory.HEADER_LENGTH)
      throw new Error('Directory data is shorter than its header');

    this.structureLength = data[1];

    if (this.structureLength < 16)
      throw new Error('Invalid directory structure length ' + this.structureLength);

    if ((data.byteLength - Directory.HEADER_LENGTH) % this.structureLength !== 0)
      throw new Error('Directory data ends with an incomplete file record');

    this.majorRevision = (data[0] & 0xF0) >> 4;
    this.minorRevision = data[0] & 0x0F;
    this.timeFormat = data[2];
    this.currentSystemTime = dv.getUint32(8 + data.byteOffset, true);
    this.lastModified = dv.getUint32(12 + data.byteOffset, true);

    if (this.lastModified !== Directory.SYSTEM_TIME_NOT_USED && this.lastModified >= 0x0FFFFFFF)
      this.lastModifiedDate = new Date(Date.UTC(1989, 11, 31, 0, 0, 0, 0) + this.lastModified * 1000);

    if (this.log.logging)
      this.logger('log', 'directory', this.toString());

    this.file = [];
    const numberOfFiles = (data.byteLength - Directory.HEADER_LENGTH) / this.structureLength;

    for (let fileNr = 0; fileNr < numberOfFiles; fileNr++) {
      const iStart = Directory.HEADER_LENGTH + fileNr * this.structureLength,
        iEnd = Directory.HEADER_LENGTH + (fileNr + 1) * this.structureLength,
        fileType = data[iStart + 2],
        fileMetaData = data.subarray(iStart, iEnd);

      switch (fileType) {
        case File.TYPE.FIT:
          file = new FitFile(fileMetaData, this);
          break;
        default:
          file = new File(fileMetaData, this);
          break;
      }

      this.file.push(file);

      if (this.log.logging)
        this.logger('log', this.file[fileNr].toString(this.timeFormat));
    }
  }

  getTotalBlocks(maxBlockSize) {
    let totalBytes = 0;

    for (let i = 0; i < this.file.length; i++)
      totalBytes += this.file[i].size;

    if (!maxBlockSize)
      return Math.ceil(totalBytes / 512);
    else
      return Math.ceil(totalBytes / maxBlockSize);
  }

  indexOf(index) {
    for (let i = 0; i < this.file.length; i++) {
      if (this.file[i].index === index)
        return i;
    }

    return -1;
  }

  _showFileIndex() {
    return this.file.map(file => file.index);
  }

  eraseFile(index) {
    const filePosition = this.indexOf(index),
      removedFiles = filePosition === -1 ? [] : this.file.splice(filePosition, 1);

    if (this.log.logging)
      this.log.debug('Directory file index after removal of index ' + index, this._showFileIndex());

    return removedFiles[0];
  }

  getNewFITfiles() {
    return this.getFITfiles(true);
  }

  getFITfiles(newOnly) {
    const readable = [];

    this.file.forEach(file => {
      const addCondition = newOnly ?
        file instanceof FitFile && !file.permission.archive && file.permission.read :
        file instanceof FitFile && file.permission.read;

      if (addCondition)
        readable.push(file.index);
    });

    return readable;
  }

  ls() {
    let total = 0;

    this.file.forEach(file => { total += file.size; });

    let str = '\nFlags: R=read W=write E=erase A=archived P=append C=crypto\n';
    str += 'total ' + File.humanSize(total) + ' in ' + this.file.length + ' files\n';
    str += File.UNIX_HEADER + '\n';
    this.file.forEach(file => { str += file.toUnixString() + '\n'; });

    return str;
  }

  toString() {
    let msg = 'Version : ' + this.majorRevision + '.' + this.minorRevision + ' | Time format : ';

    switch (this.timeFormat) {
      case Directory.TIME_FORMAT.ELAPSED_TIME_SINCE_DEC31_1989:
        msg += 'Secs. elapsed since dec 31 1989 00:00';
        break;
      case Directory.TIME_FORMAT.SYSTEM_TIME:
        msg += 'Secs. since power up';
        break;
      case Directory.TIME_FORMAT.COUNTER:
        msg += 'Counter';
        break;
    }

    msg += ' | Current system time : ' + this.currentSystemTime;
    if (this.currentSystemTime === Directory.SYSTEM_TIME_NOT_USED)
      msg += ' Not used';

    msg += ' | Last modified : ' + this.lastModified;
    if (this.lastModifiedDate)
      msg += ' UTC : ' + this.lastModifiedDate.toUTCString();

    return msg;
  }

  static SYSTEM_TIME_NOT_USED = 0xFFFFFFFF;
  static UNKNOWN_DATE = 0xFFFFFFFF;
  static TIME_FORMAT = {
  ELAPSED_TIME_SINCE_DEC31_1989: 0,
  SYSTEM_TIME: 1,
  COUNTER: 2
};
  static HEADER_LENGTH = 16;
}






export default Directory;
