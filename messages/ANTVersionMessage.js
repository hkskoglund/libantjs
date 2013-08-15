"use strict"
var ANTMessage = require('./ANTMessage.js'),
    RequestMessage = require('./RequestMessage.js');

function ANTVersionMessage(data) {

    if (typeof data !== "undefined") {
        ANTMessage.call(this, data);
        this.parse();
    } else
        ANTMessage.call(this);

    this.name = "ANT Version";
    this.id = ANTMessage.prototype.MESSAGE.ANT_VERSION;

   // console.log("Created ANTVersionMessage", this);
}

ANTVersionMessage.prototype = Object.create(ANTMessage.prototype);

ANTVersionMessage.prototype.constructor = ANTVersionMessage;

ANTVersionMessage.prototype.parse = function () {

    this.message = this.content.slice(0,-1).toString('utf8'); // Content is a 11 - bytes null terminated string - strip off the null

    return this.message;

};

ANTVersionMessage.prototype.getBuffer = function () {
    var msg = (new RequestMessage(0, ANTMessage.prototype.MESSAGE.ANT_VERSION)).getBuffer();
    //console.log("version msg", msg);
    return Buffer.concat([msg, this.getPadZeroBuffer(64-msg.length+1)]);
    //return msg;
}

ANTVersionMessage.prototype.toBuffer = ANTVersionMessage.prototype.getBuffer;

ANTVersionMessage.prototype.toString = function () {
    return this.name + " 0x" + this.id.toString(16) + " " + this.length + " " + this.message;
}

module.exports = ANTVersionMessage;