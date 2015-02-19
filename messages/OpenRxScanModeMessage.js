/* global define: true, Uint8Array: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    'use strict';

    var Message = require('./Message');

    function OpenRxScanModeMessage()
    {
      var content = new Uint8Array(1);

         Message.call(this);

        this.id = Message.prototype.MESSAGE.OPEN_RX_SCAN_MODE;
        this.name = "Open Rx Scan Mode";

        content[0] = Message.prototype.FILLER_BYTE; // By default new UintArray sets underlying array to 0, be sure its 0

        this.setContent(content.buffer);
    }

    OpenRxScanModeMessage.prototype = Object.create(Message.prototype);
    OpenRxScanModeMessage.prototype.constructor = OpenRxScanModeMessage;

    module.exports = OpenRxScanModeMessage;
    return module.exports;
});
