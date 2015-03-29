/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  'use strict';

  module.export = {
    DISABLED: 0x00,
    CHANNEL_ID_ENABLED: 0x20, // 00100000
    RSSI_ENABLED: 0x40, // 01000000
    RX_TIMESTAMP_ENABLED: 0x80, // 10000000
  };

  return module.export;
