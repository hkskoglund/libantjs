/* global define: true, chrome: true, Uint8Array: true,  */
 
define(function (require, exports, module) {
   "use strict"; 
    var USBDevice = require('usb/USBDevice');
       
    
    function USBChrome(options) {
      
        USBDevice.call(this,options);
        if (options && this.log.logging)
            this.log.log('log','USB options',options);
        
    }
    
    USBChrome.prototype = Object.create(USBDevice.prototype, { constructor : { value : USBChrome,
                                                                            enumerable : false,
                                                                            writeable : true,
                                                                            configurable : true } });
    
    // Assume correspondence between resultCodes and LIBUSB
    USBChrome.prototype.LIBUSB_TRANSFER_COMPLETED = 0;
    USBChrome.prototype.LIBUSB_TRANSFER_ERROR = 1;
    USBChrome.prototype.LIBUSB_TRANSFER_TIMED_OUT = 2;
    USBChrome.prototype.LIBUSB_TRANSFER_CANCELLED= 3;
    USBChrome.prototype.LIBUSB_TRANSFER_STALL = 4;
    USBChrome.prototype.LIBUSB_TRANSFER_NO_DEVICE = 5;
    USBChrome.prototype.LIBUSB_TRANSFER_OVERFLOW = 6;
    
    USBChrome.prototype.getINendpointPacketSize = function () {
        return this.inEP.maximumPacketSize;
    };
    
    USBChrome.prototype.transfer = function (chunk, callback) {
    
    var msg;
    
        if (!this.outEP)
        {
            
            msg = 'Cannot write to out endpoint of device, its undefined, device not initialized properly';
           if (this.log.logging) this.log.log('error',msg,chunk);
           callback(new Error(msg));
           return;
        }
        
        var onTX = function (TXinformation) {
            if (TXinformation.resultCode === USBChrome.prototype.LIBUSB_TRANSFER_COMPLETED) {
                //console.log(Date.now(), "Tx", TXinfo);
                callback();
            }
            else {
                if (this.log.logging) this.log.log('error', "Tx failed", TXinformation);
                callback(new Error(chrome.runtime.lastError));
            }
    
        }.bind(this);
    
        var TXinfo = {
            "direction": this.outEP.direction,
            "endpoint": this.outEP.address,
            //"length": this.outEP.maximumPacketSize
            "data" : chunk.buffer
        };
    
        if (this.log.logging) this.log.log('log',"TX ", TXinfo,chunk);
        chrome.usb.bulkTransfer(this.connectionHandle, TXinfo, onTX);
    };
    
    USBChrome.prototype.listen = function (rXparser) {
    
        var transferErrorCount = 0,
            MAX_TRANSFER_ERROR_COUNT = 10,// Count LIBUSB result codes other than completed === 0
            inlengthMax = this.options.length.in || this.inEP.maximumPacketSize; 
        
       // console.trace();
       
        if (this.log.logging) this.log.log('log','RX packet max length  '+inlengthMax+' bytes');
        
        var RXinfo = {
            "direction": this.inEP.direction,
            "endpoint": this.inEP.address | 128, // Raw endpoint address, as reported in bEndpoint descriptor
            "length":   inlengthMax // Can be increased limited by LIBUSB buffering mechanism
        };
    
        var onRX = function _onRX(RXinfo) {
              
                var data;
                //console.timeEnd('RX');
                if (RXinfo.resultCode === USBChrome.prototype.LIBUSB_TRANSFER_COMPLETED) {
                    transferErrorCount = 0;
                    data = new Uint8Array(RXinfo.data);
                    if (this.log.logging) this.log.log('log', "Rx", RXinfo, data );
                   try {
                       if (this.log.logging) console.time('RXparse');
                     
                      rXparser(undefined,data);
                       if (this.log.logging) console.timeEnd('RXparse');
                       
                    } catch (e)
                    {
                     if (this.log.logging)
                         this.log.log('error','Got onRX error',e,e.stack);
                        else
                            console.error('Got onRX error',e,e.stack); // Force logging of serious error
                    }
                         
                     
                }
                else {
                     transferErrorCount++;
                    if (this.log.logging) this.log.log('error', "Rx failed, resultCode ", RXinfo.resultCode, chrome.runtime.lastError.message);
                    rXparser(new Error(chrome.runtime.lastError.message));
                }
         
            // Transfer may be cancelled by e.g releaseInterface -> don't attempt retries
            
            if (RXinfo.resultCode !== USBChrome.prototype.LIBUSB_TRANSFER_CANCELLED) {
                if (transferErrorCount < MAX_TRANSFER_ERROR_COUNT )
                     retry();
                else
                    rXparser(new Error('Too many attempts with error from LIBUSB. Listening on in endpoint stopped.'));
            }
             
            
        }.bind(this);
    
       var retry = function _retryBulkTransfer() {
            //console.time('RX');
           // this.log.log('log',"retry", this.connectionHandle, RXinfo, onRX);
            
                    chrome.usb.bulkTransfer(this.connectionHandle,RXinfo, onRX);
           
            
        }.bind(this);
        
     if (this.log.logging) this.log.log('log', "Listening on RX endpoint, address "+RXinfo.endpoint+", max endpoint packet length is "+this.getINendpointPacketSize());
     
        retry();
    
    
    };
    
    USBChrome.prototype.exit = function(callback)
    {
       
        if (this.connectionHandle && this.deviceInterface) { 
            chrome.usb.releaseInterface(this.connectionHandle,this.deviceInterface.interfaceNumber, function () {
              
                chrome.usb.closeDevice(this.connectionHandle, function _closed () { 
                  
                    callback();
                }); }.bind(this));
        } else
            callback(new Error('Wrong USB connection handle and/or device interface'));
                   
    };
    
    USBChrome.prototype.init = function (callback)
    {
        
    //    var onData = function (error, data) {
    //        
    //        this.log.log('log', "Parse RX", error, data);
    //        
    //        if (typeof data === "undefined")
    //            return;
    //
    //        var msgId = data[2];
    //
    //        switch (msgId) {
    //                
    //            case ANTMessage.prototype.MESSAGE.NOTIFICATION_STARTUP:
    //                this.log.log('log',"Notification startup");
    //                break;
    //                
    //            default:
    //                this.log.log('error',"Not implemented parsing of msgId", msgId);
    //                break;
    //        }
    //
    //    };
    
        var onInterfaceClaimed = function () {
            
            if (this.log.logging) this.log.log('log','Interface number '+this.deviceInterface.interfaceNumber+' claimed', 'in',this.inEP, 'out',this.outEP);
            try {
               callback();
            } catch (e)
                {
                    console.error(e,e.stack);
                }
                
        }.bind(this);
    
        var onInterfaceFound = function (interfaces) {
            if (interfaces && interfaces.length > 0) {
                if (this.log.logging) this.log.log('log',"Interfaces", interfaces);
                this.deviceInterface = interfaces[0];
                if (interfaces[0].endpoints && interfaces[0].endpoints.length > 1) {
                    
                    this.inEP = this.deviceInterface.endpoints[0];
                    this.outEP = this.deviceInterface.endpoints[1];
                   
                    chrome.usb.claimInterface(this.connectionHandle, this.deviceInterface.interfaceNumber, onInterfaceClaimed);
                     
                } else
                    if (this.log.logging) this.log.log('error','Failed to get in/out endpoint on interface');
            }
            else
                callback(new Error("Did not find interface of device"));
        }.bind(this),
    
         onDeviceFound = function (devices) {
            var chosenDevice = 0;
            if (this.options && typeof this.options.device === 'undefined') {
                if (this.log.logging) this.log.log('warn','No number for device specified, will choose the first (device 0)');
            }
            else 
                chosenDevice = this.options.device;
            
            
            if (this.log.logging && devices) this.log.log('log',"USB devices found", devices);
            if (this.log.logging && !devices) this.log.log('error','No USB devices found satisfying open criteria');
            
            //var devices = devices;
            if (devices) {
                if (devices.length > 0) {
                    
                    this.connectionHandle = devices[chosenDevice];
                    if (this.log.logging) this.log.log('log',"Device(s) found: " + devices.length,' choosing device '+chosenDevice, 'Connectionhandle',this.connectionHandle);
                    // chrome.usb.listInterfaces(ConnectionHandle handle, function callback)
                    chrome.usb.listInterfaces(this.connectionHandle, onInterfaceFound);
                } else 
                    callback(new Error("No USB devices was found"));
            } else 
                callback(new Error("Maybe permissions for accessing the device is not fullfilled"));
           
        }.bind(this);
        
       
        
        // Enumerate devices
        
        this._enumerateDevicesInManifest(function (error) {
            var defaultDevice, devNr;
            
            if (error)
                callback(error);
            else {
                // TEST multiple devices
               // this.enumeratedDevices.push({ name : 'testname', id: 'testid', vendorId : 1111, productId: 2222});
             
            // Special case : No device is previously set by user, by convention choose the first enumerated device
            // Most ordinary users only have 1 ANT device 
            if (!this.options.deviceId)
            {
                if (this.log.logging) this.log.log('warn','No default device id specificed in USB options');
                if (this.enumeratedDevices && this.enumeratedDevices[0])
                {
                        
              
                    this.device = 0; // Index within devices with similar vid and pid
                    defaultDevice = this.enumeratedDevices[0];
                    this.defaultDevice = 0; // Index within enumeratedDevices array
                    
                    if (this.options.deviceWatcher && this.options.deviceWatcher.onEnumerationCompleted && typeof this.options.deviceWatcher.onEnumerationCompleted === 'function') this.options.deviceWatcher.onEnumerationCompleted();
                    
                     if (this.log.logging) this.log.log('log','Trying to open ANT device ',defaultDevice);
                     chrome.usb.findDevices({ "vendorId": defaultDevice.vendorId, "productId": defaultDevice.productId}, onDeviceFound);
                }
            } else {
                
                // Find deviceId among the enumerated devices
                if (this.log.logging) this.log.log('log','Looking for device id ',this.options.deviceId,this.enumeratedDevices.length);
                
                for (devNr =0; devNr<this.enumeratedDevices.length;devNr++)
                {
                    if (this.enumeratedDevices[devNr].id === this.options.deviceId)
                    {
                        defaultDevice = this.enumeratedDevices[devNr];
                        this.defaultDevice = devNr;
                        break;
                    }
                }
                
                if (this.enumeratedDevices.length > 0 && typeof this.defaultDevice === 'undefined')
                {
                    if (this.log.logging) this.log.log('warn','Did not find default device with id '+this.options.deviceId+', choosing the first enumerated device');
                    this.defaultDevice = 0;
                    defaultDevice = this.enumeratedDevices[0];
                    
                } 
                   
                if (defaultDevice) {
                    if (this.log.logging) this.log.log('log','Trying to open ANT device ',defaultDevice);
                         chrome.usb.findDevices({ "vendorId": defaultDevice.vendorId, "productId": defaultDevice.productId}, onDeviceFound);
                }
                
                
               // Give chance for UI update now
              if (this.options.deviceWatcher && this.options.deviceWatcher.onEnumerationCompleted && typeof this.options.deviceWatcher.onEnumerationCompleted === 'function') this.options.deviceWatcher.onEnumerationCompleted();
                
            }
              //chrome.usb.findDevices({ "vendorId": this.options.vid, "productId": this.options.pid}, onDeviceFound);
            }
        }.bind(this));
   
        
    };
    
    USBChrome.prototype._generateDeviceId = function (device,devNr)
{
    return 'device'+device.device+'#vid'+device.vendorId+'#pid'+device.productId+'#devNr'+devNr;
}
    
USBChrome.prototype._enumerateDevicesInManifest = function (callback)
{
    var devNoManifest = 0,
        lenDevInManifest,
        devicesInManifest,
         _gotDevices = function (devices)
                                  {
                                      var devNr;
                                      
                                      if (this.log.logging) this.log.log('log','Found devices for '+currentDevice.name,devices);
                                      
                                      // Add to enumerated device collection
                                      
                                      for (devNr=0; devNr< devices.length; devNr++) {
                                          // Add name and id  to default data structure by USB chrome
                                          devices[devNr].name = currentDevice.name;
                                          devices[devNr].deviceNr = devNr;
                                           devices[devNr].id = this._generateDeviceId(devices[devNr],devNr);
                                        //  devices[devNr].id = 'device'+devices[devNr].device+'#vid'+devices[devNr].vendorId+'#pid'+devices[devNr].productId+'#devNr'+devNr;
                                          this.enumeratedDevices.push(devices[devNr]);
                                      }
                                      
                                      
                                      devNoManifest++;
                                      
                                      if (devNoManifest < lenDevInManifest) {
                                          // if (this.log.logging) this.log.log('log','devno length',devNoManifest,lenDevInManifest);
                                          getDevices();
                                      }
                                        else {
                                           if (this.log.logging) this.log.log('info','Enumerated devices',this.enumeratedDevices);
                                              if (typeof callback === 'function')
                                                  callback(undefined);
                                        }
                                  }.bind(this),
        currentDevice,
        
    
     getDevices = function ()
    {
        currentDevice = devicesInManifest[devNoManifest];
        
        if (this.log.logging) this.log.log('log','Get devices for  ',currentDevice,devNoManifest,lenDevInManifest);
        
        chrome.usb.getDevices({ "vendorId": currentDevice.vendorId,
                               "productId": currentDevice.productId}, _gotDevices);
    }.bind(this);
    
      devicesInManifest = this._getUSBDevicesFromManifest();
        
        if (this.log.logging) this.log.log('log','ANT devices declared in manifest',devicesInManifest);
    
    lenDevInManifest = devicesInManifest.length;
    
    this.enumeratedDevices = [];
                                      
    if (lenDevInManifest > 0)
        getDevices();
    else {
       // if (this.log.logging) this.log.log('error','No ANT devices configured in manifest, cannot enumerate devices');
        
        if (typeof callback === 'function')
               callback(new Error('No ANT devices configured in manifest, cannot enumerate devices'));
    }
    
};

USBChrome.prototype._getUSBDevicesFromManifest = function () {
    var permissions = chrome.runtime.getManifest().permissions;
    for (var permissionNr=0; permissionNr < permissions.length; permissionNr++)
    {
        if (typeof permissions[permissionNr] === 'object' && permissions[permissionNr].usbDevices) {
            return permissions[permissionNr].usbDevices;
           
        }
    }
    
    // return undefined; implicit
};
        
    // Expose module
    
        return USBChrome;
    
  
});
