'use strict';

  var GenericPage = require('./page');

  function MainPage(configuration, broadcast, profile, pageNumber) {

    GenericPage.call(this, configuration, broadcast, profile, pageNumber);

  }

  MainPage.prototype = Object.create(GenericPage.prototype);
  MainPage.prototype.constructor = MainPage;

  module.exports = MainPage;
  

// TO DO : Remove?
