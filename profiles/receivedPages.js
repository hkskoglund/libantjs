/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */


  'use strict';

  var GenericPage = require('./Page');

  // Use named function to allow for tracing in profiler
  function ReceivedPages(sensorId) {

    this.all = [];
    for (var type in GenericPage.prototype.TYPE)
      this[GenericPage.prototype.TYPE[type]] = {};
  }

  module.exports = ReceivedPages;
  return module.exports;
