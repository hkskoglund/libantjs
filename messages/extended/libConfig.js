if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(function(require, exports, module) {

  'use strict';

  module.export = {
    DISABLED: 0x00,
    CHANNEL_ID_ENABLED: 0x20, // 00100000
    RSSI_ENABLED: 0x40, // 01000000
    RX_TIMESTAMP_ENABLED: 0x80, // 10000000
  };

  return module.export;
});