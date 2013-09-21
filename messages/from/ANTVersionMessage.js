"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
var ANTMessage = require('messages/ANTMessage');
  

function ANTVersionMessage() {

    //if (typeof data !== "undefined") {
    //    ANTMessage.call(this, data);
    //    this.parse();
    //} else
        ANTMessage.call(this);

    this.name = "ANT Version";
    this.id = ANTMessage.prototype.MESSAGE.ANT_VERSION;

   // console.log("Created ANTVersionMessage", this);
}

ANTVersionMessage.prototype = Object.create(ANTMessage.prototype);

ANTVersionMessage.prototype.constructor = ANTVersionMessage;

ANTVersionMessage.prototype.parse = function () {
   
      this.version = this.content.slice(0,-1).toString('utf8'); // Content is a 11 - bytes null terminated string - strip off the null

   // return this.message;

};

ANTVersionMessage.prototype.toString = function () {
    return this.name + " " + this.version;
}

module.exports = ANTVersionMessage;
    return module.exports;
});