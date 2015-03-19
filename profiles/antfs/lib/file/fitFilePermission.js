/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';


  function FitFilePermission(flags) {
    this.flags = flags;

    this.selected = this.flags & FitFilePermission.prototype.BIT_MASK.SELECTED ? true : false;
  }

  FitFilePermission.prototype.BIT_MASK = {
    SELECTED: 0x01 // Selected (file is user selected)
  };

  FitFilePermission.prototype.toString = function() {
    if (this.selected)
      return 'Selected : User selected';
    else
      return 'Selected : NO';
  };

  module.exports = FitFilePermission;
  return module.exports;

});
