'use strict';

  var HRMPage = require('./hrm-page');

  class HRMPage0 extends HRMPage {
  constructor(configuration, broadcast, profile, pageNumber) {


    super(configuration, broadcast, profile, pageNumber);
  }

  readCommonBytes() {


    this.readHR();

    // Old legacy format doesnt have previous heart beat event time
  }
}






  module.exports = HRMPage0;

