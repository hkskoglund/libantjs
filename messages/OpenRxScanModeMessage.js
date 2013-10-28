/* global define: true, Uint8Array: true */

define(function (require, exports, module) {
    'use strict';
    
    var ANTMessage = require('messages/ANTMessage');
      

    function OpenRxScanModeMessage()
    {
         ANTMessage.call(this);
    
        this.id = ANTMessage.prototype.MESSAGE.OPEN_RX_SCAN_MODE;
        this.name = "Open Rx Scan Mode";
  
        this.type = ANTMessage.prototype.TYPE.REQUEST;
        
       this.responseId = ANTMessage.prototype.MESSAGE.CHANNEL_RESPONSE; // Expect a CHANNEL RESPONSE (hopefully RESPONSE NO ERROR === 0)
        var content = new Uint8Array(1);
        content[0] = ANTMessage.prototype.FILLER_BYTE; // By default new UintArray sets underlying array to 0, be sure its 0
        
        this.setContent(content.buffer);
    }
    
    OpenRxScanModeMessage.prototype = Object.create(ANTMessage.prototype);
    OpenRxScanModeMessage.prototype.constructor = OpenRxScanModeMessage;

    module.exports = OpenRxScanModeMessage;
        return module.exports;
});
