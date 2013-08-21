"use strict"

var ANTMessage = require('./ANTMessage.js');


function LibConfigMessage(libConfig) {

    var msgBuffer = new Buffer(2);
        
    msgBuffer[0] = 0x00; // Filler
    msgBuffer[1] = libConfig; 

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.LIBCONFIG;
    this.name = "Lib Config";

    this.setContent(msgBuffer)

    //console.log("LibConfigMessage", this);
}

LibConfigMessage.prototype = Object.create(ANTMessage.prototype);

LibConfigMessage.prototype.constructor = LibConfigMessage;

LibConfigMessage.prototype.LIBCONFIG = {
   DISABLED : 0x00,
   RX_TIMESTAMP : 0x20,
   RSSI : 0x40,
   CHANNEL_ID : 0x80
}

LibConfigMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16);
}

module.exports = LibConfigMessage;
