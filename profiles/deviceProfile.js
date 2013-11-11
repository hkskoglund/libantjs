/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
   "use strict";
    
    var Channel = require('channel');
     
    
    function DeviceProfile(configuration) {
        Channel.call(this, configuration);
        //this._configuration = configuration;
        
        if (configuration.onPage)
            this.setOnPage(configuration.onPage);
        
        this.duplicateBroadcast = {
           counter : {},
          };
        
        this.receivedBroadcastCounter = {};
        
        this.previousPageBroadcast = {}; // Just declare property
        
        
       
    }
    
    // Inherit from Channel
    DeviceProfile.prototype = Object.create(Channel.prototype);
    
    DeviceProfile.prototype.constructor = DeviceProfile;
    
    // FILTER - Skip duplicate messages from same master 
    DeviceProfile.prototype.isDuplicateMessage = function (broadcast) {
     var 
   
       data = broadcast.data,
        bitmask,
         isHRM = broadcast.channelId.deviceType === 120 ? true : false,
        
        pageIdentifier = broadcast.channelId.getUniqueId()+'.',
        
         // Compare buffers byte by byte
         equalBuffer = function (buf1,buf2)
        {
            // Could have used bitmask from outer function via closure mechanism, but chose to pass is as a argument (could be moved without requiring context)
            
             var byteNr,
                 applyBitmask;
            
           
             if (!isHRM)
                 applyBitmask = 0xFF;
             else
                 applyBitmask = 0x7F;
           
            if (buf1.length !== buf2.length)
                return false;
            
            for (byteNr = 0; byteNr < buf1.length; byteNr++) {
              
                if (byteNr === 0 && ((buf1[byteNr] & applyBitmask) !== (buf2[byteNr] & applyBitmask)))
               
                    return false;
                 else if (byteNr > 0 && buf1[byteNr] !== buf2[byteNr]) 
                     return false;
            }
            
           // console.log("Buffer",buf1,buf2,equal);
            
            return true;
            
        };
        
        // console.log("Page identifier",pageIdentifier);

        // HRM has page toggle bit
     if (isHRM) {
       
         pageIdentifier += (data[0] & 0x7F); // Stip off msb bit 
        
     }
     else
         pageIdentifier += data[0];

        
        if (this.previousPageBroadcast[pageIdentifier] && equalBuffer(this.previousPageBroadcast[pageIdentifier],data)) {
           
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
    
        delete this.previousPageBroadcast[pageIdentifier]; // Explicit removal from heap of previous data
        this.previousPageBroadcast[pageIdentifier] = data;
        
      return this.duplicateBroadcast.counter[pageIdentifier]  > 0;
};
    
    DeviceProfile.prototype.verifyDeviceType = function (deviceType,broadcast)
    {
        var sensorId = broadcast.channelId.getUniqueId();
      
        if (broadcast.channelId.deviceType !== deviceType) {
            this.log.log('log',"Received broadcast from device type 0x"+ broadcast.channelId.deviceType.toString(16)+ " routing of broadcast is wrong!");
            return false;
        }

        if (typeof this.receivedBroadcastCounter[sensorId] !== 'undefined')
            this.receivedBroadcastCounter[sensorId]++;
        else
            this.receivedBroadcastCounter[sensorId] = 1;
        
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
    
    DeviceProfile.prototype.getOnPage = function ()
    {
        return this._onPage;
    };
    
    DeviceProfile.prototype.setOnPage = function (callback)
    {
        if (typeof callback === 'function')  {
            this._onPage = callback;
            this.log.log('log', 'Setting ', this, 'on page for ANT+ callback');
        } else
            this.log.log('error','Callback for on page is not a function',typeof callback,callback);
    };
    
    DeviceProfile.prototype.onPage = function (page)
    {
        if (typeof this._onPage === 'function')
           this._onPage(page);
        else
            this.log.log('warn','No on page callback specified for page ',page);
    };
    
    module.exports = DeviceProfile;
    
    return module.exports;
});

