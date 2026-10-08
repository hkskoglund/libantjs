'use strict';

  var BackgroundPage = require('../background-page');

  function HRMPage9(configuration, broadcast, profile, pageNumber) {

    BackgroundPage.call(this, configuration, broadcast, profile, pageNumber);

    this.read(broadcast);

  }

  HRMPage9.prototype = Object.create(BackgroundPage.prototype);
  HRMPage9.prototype.constructor = HRMPage9;

  HRMPage9.prototype.HEART_BEAT_EVENT_TYPE = {
    MEASURED: 0,
    COMPUTED: 1
  };

  HRMPage9.prototype.read = function(broadcast) {
    var data = broadcast.data;

    this.heartBeatEventType = data[1] & 0x03;
    this.reserved = [
      data[1] & 0xfc,
      data[2],
      data[3]
    ];
  };

  HRMPage9.prototype.toString = function() {
    var eventType = this.HEART_BEAT_EVENT_TYPE[this.heartBeatEventType];

    return "P# " + this.number + " Heart beat event type " +
      (eventType === undefined ? "Reserved (" + this.heartBeatEventType + ")" : eventType);
  };

  module.exports = HRMPage9;
