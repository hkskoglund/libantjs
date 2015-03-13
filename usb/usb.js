/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true, module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  var UsbLib,
      usbLibraryPath;

  // Detect host environment, i.e if running on node then load node specific USB library
  function requireUSB()
  {

    if (typeof process !== 'undefined' && process.title === 'node') { // Node/iojs
      usbLibraryPath = './USBNode';
    }
    else if (typeof window !== 'undefined' && typeof window.chrome === 'object') { // Chrome packaged app
      usbLibraryPath = './USBChrome';
    }

    UsbLib = require(usbLibraryPath);
  }

  requireUSB();

  module.exports = UsbLib;
  return module.exports;
});
