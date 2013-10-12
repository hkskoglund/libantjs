/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
   "use strict";
    
    var Channel = require('channel');
     
    
    function DeviceProfile(configuration) {
        Channel.call(this, configuration);
        //this._configuration = configuration;
        
        
        this.duplicateBroadcast = {
           counter : {},
          };
        
        this.receivedBroadcastCounter = 0;
        
        this.previousBroadcast = {}; // Just declare property
        
        
       
    }
    
    // Inherit from Channel
    DeviceProfile.prototype = Object.create(Channel.prototype);
    
    DeviceProfile.prototype.constructor = DeviceProfile;
    
    // FILTER - Skip duplicate messages from same master 
    DeviceProfile.prototype.isDuplicateMessage = function (broadcast,BITMASK) {
     var 
   
       data = broadcast.data,
        bitmask = BITMASK,
        pageIdentifier = broadcast.channelId.getUniqueId()+'.'+data[0 & BITMASK],
        
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
        
       // console.log("Page identifier",pageIdentifier);
        
        if (this.previousBroadcast[pageIdentifier] && equalBuffer(this.previousBroadcast[pageIdentifier],data,bitmask)) {
           
                // If counter is not reset for page, do it now
                if (this.duplicateBroadcast.counter[pageIdentifier] === undefined) 
                    this.duplicateBroadcast.counter[pageIdentifier] = 0;
            
                this.duplicateBroadcast.counter[pageIdentifier]++;
    
              
            } else {
              
                 
                //console.log(this.duplicateBroadcast);
                
                if (this.duplicateBroadcast.counter[pageIdentifier] > 0) {
                  // this.log.log('log','Skipped ' + this.duplicateBroadcast.counter[pageIdentifier]+ ' duplicate messages');
                 this.duplicateBroadcast.counter[pageIdentifier] = 0;
                }
            }
    
        this.previousBroadcast[pageIdentifier] = data;
        
      return this.duplicateBroadcast.counter[pageIdentifier]  > 0;
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

