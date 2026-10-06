'use strict';

  var GenericPage = require('./Page');

  // Use named function to allow for tracing in profiler
  function ReceivedPages(sensorId) {

    this.all = [];
    // TO DO: GenericPage.prototype.TYPE is not defined in Page.js.
    // for (var type in GenericPage.prototype.TYPE)
    //  this[GenericPage.prototype.TYPE[type]] = {};
  }

  module.exports = ReceivedPages;
  
