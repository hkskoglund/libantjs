'use strict';
import MainPage from '../main-page.js';



  // Data page 0 - General Information
  // "Provides general information about the device's capabilities", spec. p. 15

  class TemperaturePage0 extends MainPage {
  constructor(configuration, broadcast, profile, pageNumber) {


    super(configuration, broadcast, profile, pageNumber);
  }

  readCommonBytes(broadcast) {

    var data = broadcast.data,
      dataView = new DataView(data.buffer),
      supportedPages;

    // Byte 3 - Transmission info

    this.transmissionInfo = {
      localTime: undefined,
      UTCTime: undefined,
      defaultTransmissionRate: undefined
    };

    this.transmissionInfo.localTime = (data[TemperaturePage0.BYTE.TRANSMISSION_INFO] & TemperaturePage0.BIT_MASK.LOCAL_TIME) >> TemperaturePage0.BIT_FIELD.TRANSMISSION_INFO.LOCAL_TIME.START_BIT;
    this.transmissionInfo.UTCTime = (data[TemperaturePage0.BYTE.TRANSMISSION_INFO] & TemperaturePage0.BIT_MASK.UTC_TIME) >> TemperaturePage0.BIT_FIELD.TRANSMISSION_INFO.UTC_TIME.START_BIT;
    this.transmissionInfo.defaultTransmissionRate = data[TemperaturePage0.BYTE.TRANSMISSION_INFO] & TemperaturePage0.BIT_MASK.DEFAULT_TRANSMISSION_RATE;


    // Byte 4 - 7  - Supported pages

    this.supportedPages = {
      value: undefined
    };

    supportedPages = dataView.getUint32(data.byteOffset + TemperaturePage0.BYTE.SUPPORTED_PAGES, true);
    this.supportedPages.value = supportedPages;

    for (var bitNr = 0; bitNr < 32; bitNr++) {
      if (supportedPages & (1 << bitNr)) {
        this.supportedPages['page' + bitNr] = true;
      }
    }
  }

  toString() {

    var msg = "P# " + this.number + " Local time " + TemperaturePage0.TRANSMISSION_INFO.LOCAL_TIME[this.transmissionInfo.localTime] +
      " UTC time " + TemperaturePage0.TRANSMISSION_INFO.UTC_TIME[this.transmissionInfo.UTCTime] +
      " Tch " + TemperaturePage0.TRANSMISSION_INFO.DEFAULT_TRANSMISSION_RATE[this.transmissionInfo.defaultTransmissionRate] +
      " Pages 0b" + this.supportedPages.value.toString(2);

    return msg;
  }

  static BIT_FIELD = {

    TRANSMISSION_INFO: {
      LOCAL_TIME: {
        START_BIT: 4,
        LENGTH: 2
      },
      UTC_TIME: {
        START_BIT: 2,
        LENGTH: 2
      },
      DEFAULT_TRANSMISSION_RATE: {
        START_BIT: 0,
        LENGTH: 2
      }
    }

  };
  static BIT_MASK = {

    TRANSMISSION_INFO: {
      LOCAL_TIME: parseInt('00110000', 2),
      UTC_TIME: parseInt('00001100', 2),
      DEFAULT_TRANSMISSION_RATE: parseInt('00000011', 2)
    }

  };
  static BYTE = {
    PAGE_NUMBER: 0,
    // Reserved
    // Reserved
    TRANSMISSION_INFO: 3,
    SUPPORTED_PAGES: 4
  };
  static TRANSMISSION_INFO = {

    LOCAL_TIME: {
      0: "Not supported",
      1: "Supported, not set",
      2: "Supported and set",
      3: "Reserved"
    },

    UTC_TIME: {
      0: "Not supported",
      1: "Supported, Not Set",
      2: "Supported and Set",
      3: "Reserved"
    },

    DEFAULT_TRANSMISSION_RATE: {
      0: "0.5 Hz",
      1: "4 Hz",
      2: "Reserved",
      3: "Reserved"
    }
  };
}




  // Bit field layout


  // Bit mask to pinpoint BIT_FIELD



  // Byte layout








  export default TemperaturePage0;

