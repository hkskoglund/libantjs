'use strict';
import HRMPage from './hrm-page.js';



  class HRMPage0 extends HRMPage {
  constructor(configuration, broadcast, profile, pageNumber) {


    super(configuration, broadcast, profile, pageNumber);
  }

  readCommonBytes() {


    this.readHR();

    // Old legacy format doesnt have previous heart beat event time
  }
}






  export default HRMPage0;

