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
    this.type = ANTMessage.prototype.TYPE.RESPONSE;
    this.requestId = ANTMessage.prototype.MESSAGE.REQUEST;

   // console.log("Created ANTVersionMessage", this);
}

ANTVersionMessage.prototype = Object.create(ANTMessage.prototype);

ANTVersionMessage.prototype.constructor = ANTVersionMessage;

ANTVersionMessage.prototype.parse = function () {
   var version = this.content.subarray(0,-1),
       versionStr = ''; // Content is a 11 - bytes null terminated string - strip off the null
      //this.version = .toString('utf8'); // Node 0.10 
    
    for (var i=0; i<version.length; i++) 
            versionStr += String.fromCharCode(version[i]);
    
    this.version = versionStr;

   // return this.message;

};

ANTVersionMessage.prototype.toString = function () {
    return this.name + " " + this.version;
};

module.exports = ANTVersionMessage;
    return module.exports;
});