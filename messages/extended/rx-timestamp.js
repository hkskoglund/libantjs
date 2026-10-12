'use strict';

// Function names based on Dynastram Android SDK v 4.00 documentation
class RXTimestamp {
  constructor(rxTimestamp) {

    this.timestamp = rxTimestamp;
  }

  decode(timestamp) {

    this.timestamp = (new DataView(timestamp.buffer, timestamp.byteOffset, timestamp.byteLength)).getUint16(0, true);
  }

  getRxTimestamp() {

    return this.timestamp;
  }

  convertRXTimestampToSeconds(timestamp) {

    if (timestamp)
      return timestamp / 32768;
    else
      return (this.timestamp / 32768);
  }

  toString() {

    return "Receive timestamp: " + this.convertRXTimestampToSeconds().toFixed(3) + " s";
  }
}

export default RXTimestamp;
