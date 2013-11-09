/* global define: true, chrome: true, Uint8Array: true,  */

define(function (require, exports, module) {
   "use strict"; 
    var USBDevice = require('usb/USBDevice');
       
    
    function USBChrome(options) {
      
        USBDevice.call(this,options);
        if (options)
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
    
        var onTX = function (TXinformation) {
            if (TXinformation.resultCode === USBChrome.prototype.LIBUSB_TRANSFER_COMPLETED) {
                //console.log(Date.now(), "Tx", TXinfo);
                callback();
            }
            else {
                this.log.log('error', "Tx failed", TXinformation);
                callback(new Error(chrome.runtime.lastError));
            }
    
        }.bind(this);
    
        var TXinfo = {
            "direction": this.outEP.direction,
            "endpoint": this.outEP.address,
            //"length": this.outEP.maximumPacketSize
            "data" : chunk.buffer
        };
    
        this.log.log('log',"TX ", TXinfo,chunk);
        chrome.usb.bulkTransfer(this.connectionHandle, TXinfo, onTX);
    };
    
    USBChrome.prototype.listen = function (rXparser) {
    
        var transferErrorCount = 0,
            MAX_TRANSFER_ERROR_COUNT = 10,// Count LIBUSB result codes other than completed === 0
            inlengthMax = this.options.length.in || this.inEP.maximumPacketSize; 
        
       // console.trace();
       
        this.log.log('log','RX packet max length  '+inlengthMax+' bytes');
        
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
                    this.log.log('log', "Rx", RXinfo, data );
                   try {
                      rXparser(undefined,data);
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
                    this.log.log('error', "Rx failed, resultCode ", RXinfo.resultCode, chrome.runtime.lastError.message);
                    rXparser(new Error(chrome.runtime.lastError.message));
                }
         
            if (transferErrorCount < MAX_TRANSFER_ERROR_COUNT)
                 retry();
            else
                rXparser(new Error('Too many attempts with error from LIBUSB. Listening on in endpoint stopped.'));
             
            
        }.bind(this);
    
       var retry = function _retryBulkTransfer() {
            //console.time('RX');
           // this.log.log('log',"retry", this.connectionHandle, RXinfo, onRX);
            
                    chrome.usb.bulkTransfer(this.connectionHandle,RXinfo, onRX);
           
            
        }.bind(this);
        
     this.log.log('log', "Listening on RX endpoint, address "+RXinfo.endpoint+", max endpoint packet length is "+this.getINendpointPacketSize());
     
        retry();
    
    
    };
    
    USBChrome.prototype.exit = function(callback)
    {
        chrome.usb.releaseInterface(this.connectionHandle,this.deviceInterface.interfaceNumber, function () {
            chrome.usb.closeDevice(this.connectionHandle,callback); }.bind(this));
                   
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
            
            this.log.log('log',"Interface claimed, endpoint available", this.inEP, this.outEP);
            try {
               callback();
            } catch (e)
                {
                    console.error(e,e.stack);
                }
                
        }.bind(this);
    
        var onInterfaceFound = function (interfaces) {
            if (interfaces && interfaces.length > 0) {
                this.log.log('log',"Interfaces", interfaces);
                this.deviceInterface = interfaces[0];
                if (interfaces[0].endpoints && interfaces[0].endpoints.length > 1) {
                    
                    this.inEP = this.deviceInterface.endpoints[0];
                    this.outEP = this.deviceInterface.endpoints[1];
                   
                    chrome.usb.claimInterface(this.connectionHandle, this.deviceInterface.interfaceNumber, onInterfaceClaimed);
                     
                } else
                    this.log.log('error','Failed to get in/out endpoint on interface');
            }
            else
                callback(new Error("Did not find interface of device"));
        }.bind(this),
    
         onDeviceFound = function (devices) {
            var chosenDevice = 0;
            if (this.options && typeof this.options.device === 'undefined')
                this.log.log('warn','No number for device specified, will choose the first (device 0)');
            else 
                chosenDevice = this.options.device;
            
            
            this.log.log('log',"USB devices", devices);
            //var devices = devices;
            if (devices) {
                if (devices.length > 0) {
                    
                    this.connectionHandle = devices[chosenDevice];
                    this.log.log('log',"Device(s) found: " + devices.length,' choosing device ',chosenDevice, this.connectionHandle);
                    // chrome.usb.listInterfaces(ConnectionHandle handle, function callback)
                    chrome.usb.listInterfaces(devices[chosenDevice], onInterfaceFound);
                } else 
                    callback(new Error("No devices was found"));
            } else 
                callback(new Error("Did not request correct permissions"));
           
        }.bind(this);
        
        chrome.usb.findDevices({ "vendorId": this.options.vid, "productId": this.options.pid}, onDeviceFound);
   
        
    };
        
        return USBChrome;
    
  
});
