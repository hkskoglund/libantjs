'use strict';
import File from './file.js';
import FitFilePermission from './fit-file-permission.js';



class FitFile extends File {
  constructor(data, directory) {
    super(data, directory);
  }

  isFit() {
    return this.getType() === File.TYPE.FIT;
  }

  decode(data) {
    const dv = new DataView(data.buffer);

    File.prototype.decode.call(this, data);

    this.subType = data[3];
    this.fileNumber = dv.getUint16(4 + data.byteOffset, true);
    this.fitPermission = new FitFilePermission(data[6]);
  }

  _formatDate() {
    const date1989 = this.getDateFrom31Dec1989(),
      iso = date1989.toISOString(),
      date = iso.substring(0, 10),
      time = date1989.toLocaleTimeString().replace(new RegExp(':', 'g'), '-');

    return date + '-' + time;
  }

  getFileName(unixFormat, omitDevice) {
    let dateStr,
      clientSerialNumber = this.directory.host.getClientSerialNumber(),
      clientFriendlyname = this.directory.host.getClientFriendlyname(),
      filename,
      indexPrefix = '',
      i;

    if (this.date === 0xFFFFFFFF)
      dateStr = '';
    else if (this.date < 0x0FFFFFFF)
      if (this.date)
        dateStr = 'system-date-' + this.date;
      else
        dateStr = '';
    else
      dateStr = this._formatDate(this.date);

    filename = FitFile.FIT_FILE_TYPES[this.subType];

    for (i = 0; this.directory.file && i < this.directory.file.length; i++) {
      if (!(omitDevice && this.subType === 4) &&
          this.directory.file[i] !== this &&
          this.directory.file[i] instanceof FitFile &&
          this.directory.file[i].subType === this.subType) {
        indexPrefix = this.index + '-';
        break;
      }
    }

    if (unixFormat)
      return indexPrefix + filename + '.fit';

    filename = indexPrefix + filename;
    if (dateStr !== '')
      filename += '-' + dateStr + '.fit';
    else
      filename += dateStr + '.fit';
    if (omitDevice)
      return filename;
    if (!clientFriendlyname)
      return 'client-' + clientSerialNumber + ' ' + filename;
    else
      return filename;
  }

  toString() {
    return File.prototype.toString.call(this) + ' | Fit permission : ' + this.fitPermission.toString() +
      ' | Sub type : ' + this.subType + ' ' + FitFile.FIT_FILE_TYPES[this.subType] +
      ' | File number : ' + this.fileNumber;
  }

  toUnixString() {
    return File.prototype.toUnixString.call(this, this.getFileName(true));
  }

  static FIT_FILE_TYPES = {
  // FIT SDK - FIT File Types D00001309 FIT File Types Description - Rev 1.6
  1: 'device-capabilities',
  2: 'settings',
  3: 'sport-settings',
  4: 'activity',
  5: 'workout',
  6: 'course',
  7: 'schedule',
  8: 'locations',
  9: 'weight',
  10: 'totals',
  11: 'goals',
  14: 'blood-pressure',
  15: 'monitoring-a',
  20: 'activity-summary',
  28: 'daily-monitoring',
  32: 'monitoring-b'
};
}



export default FitFile;
