"use strict"

var ANTMessage = require('../ANTMessage.js');


function LibConfigMessage(libConfig) {

    var msgBuffer = new Buffer(2);
        
    msgBuffer[0] = 0x00; // Filler
    msgBuffer[1] = libConfig; 

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.LIBCONFIG;
    this.name = "Lib Config";
    
    this.libConfig = libConfig;

    this.setContent(msgBuffer)

    //console.log("LibConfigMessage", this);
}

LibConfigMessage.prototype = Object.create(ANTMessage.prototype);

LibConfigMessage.prototype.constructor = LibConfigMessage;


LibConfigMessage.prototype.toString = function () {
    return this.name + " ID 0x" + this.id.toString(16) + " lib config " + this.libConfig;
}

module.exports = LibConfigMessage;
