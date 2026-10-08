'use strict';

  var SDMPage2 = require('./sdm-page2');

  function SDMPage3(configuration, broadcast) {
    SDMPage2.call(this, configuration);

    if (broadcast)
      this.profile = broadcast.profile;

    if (broadcast && broadcast.data)
      this.decode(broadcast);
  }

  SDMPage3.prototype = Object.create(SDMPage2.prototype);
  SDMPage3.prototype.constructor = SDMPage3;

  SDMPage3.prototype.decode = function(broadcast) {
    SDMPage2.prototype.decode.call(this, broadcast);
    this.calories = broadcast.data[6];
  };

  SDMPage3.prototype.toString = function() {
    return SDMPage2.prototype.toString.call(this) + ' Calories: ' + this.calories + ' kcal';
  };

  module.exports = SDMPage3;
