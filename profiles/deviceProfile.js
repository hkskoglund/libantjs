/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
   "use strict";
    
    var Channel = require('channel');
     
    
    function DeviceProfile(configuration) {
        Channel.call(this, configuration);
        //this._configuration = configuration;
        
        
        this.duplicateMessageCounter = 0;
    
        this.receivedBroadcastCounter = 0;
        
        this.previousBroadcastData = undefined; // Just declare property
        
        
       
    }
    
    // Inherit from Channel
    DeviceProfile.prototype = Object.create(Channel.prototype);
    
    DeviceProfile.prototype.constructor = DeviceProfile;
    
    // FILTER - Skip duplicate messages from same master 
    DeviceProfile.prototype.isDuplicateMessage = function (data,BITMASK) {
     var currentTime,
        TIMEOUT_DUPLICATE_MESSAGE_WARNING = 3000,
        bitmask = BITMASK,
         // Compare buffers byte by byte
         equalBuffer = function (buf1,buf2,useBitmask)
        {
            // Could have used bitmask from outer function via closure mechanism, but chose to pass is as a argument (could be moved without requiring context)
            
            var byteNr;
           
             if (useBitmask === undefined)
                useBitmask = 0xFF;
           
            if (buf1.length !== buf2.length)
                return false;
            
            for (byteNr=0; byteNr < buf1.length; byteNr++) {
                if (byteNr === 0 && ((buf1[byteNr] & useBitmask) !== (buf2[byteNr] & useBitmask))) 
                    return false;
                 else if (byteNr > 0 && buf1[byteNr] !== buf2[byteNr]) 
                     return false;
            }
            
           // console.log("Buffer",buf1,buf2,equal);
            
            return true;
            
        };
        
        if (this.previousBroadcastData && equalBuffer(this.previousBroadcastData,data,bitmask)) {
           
                currentTime = Date.now();
    
                if (this.duplicateMessageCounter === 0)
                    this.duplicateMessageStartTime = this.currentTime;
    
                if (currentTime - this.duplicateMessageStartTime >= TIMEOUT_DUPLICATE_MESSAGE_WARNING) {
                    this.duplicateMessageStartTime = this.currentTime;
                    this.log.log('log',"Duplicate message registered for " + TIMEOUT_DUPLICATE_MESSAGE_WARNING + " ms, may indicate lost heart rate data");
                }
    
                this.duplicateMessageCounter++;
    
                return true;
            } else {
                 
                if (this.duplicateMessageCounter > 0) {
                    // console.log("Skipped " + this.duplicateMessageCounter + " duplicate messages from "+broadcast.channelId.toString());
                    this.duplicateMessageCounter = 0;
                }
            }
    
      return false;
};
    
    DeviceProfile.prototype.verifyDeviceType = function (deviceType,broadcast)
    {
        this.receivedBroadcastCounter++;
    
        if (broadcast.channelId.deviceType !== deviceType) {
            this.log.log('log',"Received broadcast from device type 0x"+ broadcast.channelId.deviceType.toString(16)+ " routing of broadcast is wrong!");
            return false;
        }
        
        return true;
       
    };
   
    DeviceProfile.prototype.channelResponse = function (channelResponse) {
            this.log.log('log', 'DeviceProfile', this, channelResponse, channelResponse.toString());
    };
    
 // Default behaviour just return JSON of broadcast
   DeviceProfile.prototype.broadCast = function (broadcast)
    {
        // MAYBE return undefined;
        return JSON.stringify(broadcast);
    };
    
    DeviceProfile.prototype.setOnPageCB = function (callback)
    {
        this.log.log('log','Setting device profile on page callback to ',callback,this);
        this._onPageCB = callback;
    };
    
    DeviceProfile.prototype.onPage = function (page)
    {
        if (typeof this._onPageCB === 'function')
           this._onPageCB(page);
        else
            this.log.log('warn','No on page callback specified for page ',page);
    };
    
    module.exports = DeviceProfile;
    
    return module.exports;
});

