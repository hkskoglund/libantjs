'use strict';
import BackgroundPage from '../background-page.js';



class HRMPage9 extends BackgroundPage {
  constructor(configuration, broadcast, profile, pageNumber) {
    super(configuration, broadcast, profile, pageNumber);
    this.read(broadcast);
  }

  read(broadcast) {
    const data = broadcast.data;

    this.heartBeatEventType = data[1] & 0x03;
    this.reserved = [
      data[1] & 0xfc,
      data[2],
      data[3]
    ];
  }

  toString() {
    const eventType = this.constructor.HEART_BEAT_EVENT_TYPE[this.heartBeatEventType];

    return "P# " + this.number + " Heart beat event type " +
      (eventType === undefined ? "Reserved (" + this.heartBeatEventType + ")" : eventType);
  }

  static HEART_BEAT_EVENT_TYPE = {
  MEASURED: 0,
  COMPUTED: 1
};
}



export default HRMPage9;
