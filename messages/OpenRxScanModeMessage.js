/* global define: true, Uint8Array: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('./Message');

    function OpenRxScanModeMessage()
    {

        Message.call(this,undefined,Message.prototype.MESSAGE.OPEN_RX_SCAN_MODE);
        this.encode();

    }

    OpenRxScanModeMessage.prototype = Object.create(Message.prototype);
    OpenRxScanModeMessage.prototype.constructor = OpenRxScanModeMessage;

    OpenRxScanModeMessage.prototype.encode = function ()
    {
      var content = new Uint8Array(1);

      content[0] = Message.prototype.FILLER_BYTE; // By default new UintArray sets underlying array to 0, be sure its 0

      this.setContent(content.buffer);

    };


    module.exports = OpenRxScanModeMessage;
    return module.exports;
});
