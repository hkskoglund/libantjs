/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    "use strict";
    var ANTMessage = require('messages/ANTMessage');
      
    
    function ANTVersionMessage(data) {
    
        //if (typeof data !== "undefined") {
        //    ANTMessage.call(this, data);
        //    this.parse();
        //} else
            ANTMessage.call(this,data);
    
        this.name = "ANT Version";
        this.id = ANTMessage.prototype.MESSAGE.ANT_VERSION;
        this.type = ANTMessage.prototype.TYPE.RESPONSE;
        this.requestId = ANTMessage.prototype.MESSAGE.REQUEST;
        
        if (data)
            this.parse();
    
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
