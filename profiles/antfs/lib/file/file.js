/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  'use strict';

  var GeneralFilePermission = require('./generalFilePermission');

  function File(data) {
    if (data)
      this.decode(data);

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

  File.prototype.toString = function(timeFormat) {
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
        dateStr = (new Date(Date.UTC(1989, 11, 31, 0, 0, 0, 0) + this.date * 1000)).toLocaleString();
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

  module.exports = File;
  return module.exports;
