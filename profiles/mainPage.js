/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  'use strict';

  var GenericPage = require('./Page');

  function MainPage(configuration, broadcast, profile, pageNumber) {

    GenericPage.call(this, configuration, broadcast, profile, pageNumber);

  }

  MainPage.prototype = Object.create(GenericPage.prototype);
  MainPage.prototype.constructor = MainPage;

  module.exports = MainPage;
  return module.exports;

// TO DO : Remove?
