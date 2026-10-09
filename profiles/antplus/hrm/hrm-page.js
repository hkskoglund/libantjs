'use strict';

  var MainPage = require('../main-page');

  class HRMPage extends MainPage {
  constructor(configuration, broadcast, profile, pageNumber) {


    super(configuration, broadcast, profile, pageNumber);
  }

  readHR() {

    var data = this.broadcast.data,
      dataView = new DataView(data.buffer);

    // Time of the last valid heart beat event 1 /1024 s, rollover 64 second
    this.heartBeatEventTime = dataView.getUint16(data.byteOffset + 4, true);

    // Counter for each heart beat event, rollover 255 counts
    this.heartBeatCount = data[6];

    // Intantaneous heart rate, invalid = 0x00, valid = 1-255, can be displayed without further intepretation
    this.computedHeartRate = data[7];
  }

  calcRRInterval() {


    var previousPage,
      receivedPages = this.profile.receivedPage || [],
      previousPageIndex,
      heartBeatCountDelta,
      heartBeatEventTimeDelta,
      previousHeartBeatEventTime;

    if (this.previousHeartBeatEventTime !== undefined) {
      previousHeartBeatEventTime = this.previousHeartBeatEventTime;
    } else {
      for (previousPageIndex = receivedPages.length - 1; previousPageIndex >= 0; previousPageIndex--) {
        previousPage = receivedPages[previousPageIndex];
        if (previousPage.heartBeatCount !== undefined && previousPage.heartBeatEventTime !== undefined) {
          break;
        }
      }

      if (!previousPage || previousPageIndex < 0) {
        return;
      }

      heartBeatCountDelta = (this.heartBeatCount - previousPage.heartBeatCount + 256) % 256;
      if (heartBeatCountDelta !== 1) {
        return;
      }

      previousHeartBeatEventTime = previousPage.heartBeatEventTime;
    }

    heartBeatEventTimeDelta = (this.heartBeatEventTime - previousHeartBeatEventTime + 65536) % 65536;
    if (heartBeatEventTimeDelta > 0) {
      this.RRInterval = (heartBeatEventTimeDelta / 1024) * 1000; // ms.
    }
  }

  update() {

    this.calcRRInterval();
  }

  toString() {


    var msg = "HR " + this.computedHeartRate + " C " + this.heartBeatCount + " Tn " + this.heartBeatEventTime + " Tn-1 " + this.previousHeartBeatEventTime + " T - Tn-1 " + (this.heartBeatEventTime - this.previousHeartBeatEventTime);

    if (this.RRInterval) {
      msg += " RR " + this.RRInterval.toFixed(1) + " ms";
    }
    return msg;
  }
}




  // Deviceprofile p. 17 "Bytes 4-7 have the same definition for every data page"


  // Set RR interval based on previous heart event time and heart beat count






  module.exports = HRMPage;

