'use strict';

  var GenericPage = require('../page');

  function SDMPage1(configuration, broadcast) {


    GenericPage.call(this, configuration, broadcast);

    this.counterState = new Map();

    if (broadcast)
      this.profile = broadcast.profile;

    if (broadcast && broadcast.data)
      this.decode(broadcast);
  }

  SDMPage1.prototype = Object.create(GenericPage.prototype);
  SDMPage1.prototype.constructor = SDMPage1;

  // Bit field layout
  SDMPage1.prototype.BIT_FIELD = {

    DISTANCE_FRACTIONAL: {
      START_BIT: 4,
      LENGTH: 4
    }


  };

  // Bit mask to pinpoint BIT_FIELD

  SDMPage1.prototype.BIT_MASK = {

    UPPER_NIBBLE: 0xF0,
    LOWER_NIBLE: 0X0F

  };

  // Byte layout
  SDMPage1.prototype.BYTE = {
    PAGE_NUMBER: 0,
    TIME_FRACTIONAL: 1,
    TIME_INTEGER: 2,
    DISTANCE_INTEGER: 3,
    DISTANCE_FRACTIONAL: 4, // Upper 4 bit
    SPEED_INTEGER: 4, // Lower nibble
    SPEED_FRACTIONAL: 5,
    STRIDE_COUNT: 6,
    UPDATE_LATENCY: 7
  };

  SDMPage1.prototype.UNIT = {
    TIME_FRACTIONAL: 1 / 200, //s
    DISTANCE_FRACTIONAL: 1 / 16, // m
    SPEED_FRACTIONAL: 1 / 256, // m/s
    UPDATE_LATENCY: 1 / 32 //s

  };

  SDMPage1.prototype.decode = function(broadcast) {
    var data = broadcast.data;
    this.broadcast = broadcast;

    // Byte 0 - page number

    this.number = data[SDMPage1.prototype.BYTE.PAGE_NUMBER];

    // Byte 1 - time fractional

    this.timeFractional = data[SDMPage1.prototype.BYTE.TIME_FRACTIONAL] * SDMPage1.prototype.UNIT.TIME_FRACTIONAL; // s

    // Byte 2 - time integer

    this.timeInteger = data[SDMPage1.prototype.BYTE.TIME_INTEGER];

    this.time = this.timeInteger + this.timeFractional;

    // Byte 3 - distance integer
    this.distanceInteger = data[SDMPage1.prototype.BYTE.DISTANCE_INTEGER]; // m

    // Byte 4 - distance fractional upper 4 bit, speed integer lower 4 bit

    this.distanceFractional = ((data[SDMPage1.prototype.BYTE.DISTANCE_FRACTIONAL] & SDMPage1.prototype.BIT_MASK.UPPER_NIBBLE) >> SDMPage1.prototype.BIT_FIELD.DISTANCE_FRACTIONAL.START_BIT) * SDMPage1.prototype.UNIT.DISTANCE_FRACTIONAL; // Upper 4 bit
    this.distance = this.distanceInteger + this.distanceFractional;

    this.speedInteger = data[SDMPage1.prototype.BYTE.SPEED_INTEGER] & SDMPage1.prototype.BIT_MASK.LOWER_NIBBLE; // lower 4 bit

    // Byte 5 - speed fractional

    this.speedFractional = data[SDMPage1.prototype.BYTE.SPEED_FRACTIONAL] * SDMPage1.prototype.UNIT.SPEED_FRACTIONAL; // m/s
    this.speed = this.speedInteger + this.speedFractional;

    // Byte 6 - stride count
    this.strideCount = data[SDMPage1.prototype.BYTE.STRIDE_COUNT];

    // Byte 7 - update latency
    this.updateLatency = data[SDMPage1.prototype.BYTE.UPDATE_LATENCY] * SDMPage1.prototype.UNIT.UPDATE_LATENCY; // s

    this.updateCumulativeCounters(broadcast);

  };

  SDMPage1.prototype.updateCumulativeCounters = function(broadcast) {
    var sensorId = broadcast.channelId && broadcast.channelId.sensorId,
      previous = this.counterState.get(sensorId),
      current = {
        time: this.time,
        distance: this.distance,
        strideCount: this.strideCount
      };

    if (!previous) {
      this.cumulativeTime = 0;
      this.cumulativeDistance = 0;
      this.cumulativeStrideCount = 0;
    } else {
      this.cumulativeTime = previous.cumulativeTime +
        this.getCounterDelta(previous.time, current.time, 256);
      this.cumulativeDistance = previous.cumulativeDistance +
        this.getCounterDelta(previous.distance, current.distance, 256);
      this.cumulativeStrideCount = previous.cumulativeStrideCount +
        this.getCounterDelta(previous.strideCount, current.strideCount, 256);
    }

    current.cumulativeTime = this.cumulativeTime;
    current.cumulativeDistance = this.cumulativeDistance;
    current.cumulativeStrideCount = this.cumulativeStrideCount;
    this.counterState.set(sensorId, current);
  };

  SDMPage1.prototype.getCounterDelta = function(previous, current, rollover) {
    var delta = current - previous;

    return delta < 0 ? delta + rollover : delta;
  };

  SDMPage1.prototype.toString = function() {


    var msg = "P# " + this.number + ' ',
      UNUSED = 0x00;

    // Time starts when SDM is powered ON

    if (this.time !== UNUSED)
      msg += "SDM Time : " + this.time + " s";
    else
      msg += "SDM Time : 0" + " s";

    if (this.distance !== UNUSED)
      msg += " Distance : " + this.distance + " m";
    else
      msg += " Distance : 0" + " m";

    if (this.speed !== UNUSED)
      msg += " Speed : " + this.speed.toFixed(1) + " m/s ";
    else
      msg += " Speed : 0" + " m/s";

    msg += " Stride count : " + this.strideCount;

    // p. 25 section 6.2.7 Update Latecy . Stride Based Speed and Distance Monitor Device Profile
    // "represents the time from the end of the last motion event to the time at which the message was transmitted. This time includes computation time
    // as well as the delay before the message is actually transmitted, which depends on the message rate"
    // update latency = last motion event - transmission of message = computation time + delay before transmission
    if (this.updateLatency !== UNUSED)
      msg += " Update latency : " + this.updateLatency + " s";
    else
      msg += " Update latency : 0" + " s";

    return msg;
  };

  module.exports = SDMPage1;

  
