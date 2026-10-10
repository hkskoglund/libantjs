'use strict';
import SDMPage2 from './sdm-page2.js';



  class SDMPage3 extends SDMPage2 {
  constructor(configuration, broadcast) {

    super(configuration);

    if (broadcast)
      this.profile = broadcast.profile;

    if (broadcast && broadcast.data)
      this.decode(broadcast);
  }

  decode(broadcast) {

    SDMPage2.prototype.decode.call(this, broadcast);
    this.calories = broadcast.data[6];
  }

  toString() {

    return SDMPage2.prototype.toString.call(this) + ' Calories: ' + this.calories + ' kcal';
  }
}








  export default SDMPage3;
