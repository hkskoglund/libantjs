"use strict"
var ANTMessage = require('./ANTMessage.js');

function ResetSystem() {

    ANTMessage.call(this);

    this.id = ANTMessage.prototype.MESSAGE.RESET_SYSTEM;
    this.name = "Reset System";
    
    this.create(ANTMessage.prototype.FILLER_BYTE);

}

ResetSystem.prototype = Object.create(ANTMessage.prototype);

ResetSystem.prototype.constructor = ResetSystem;

module.exports = ResetSystem;