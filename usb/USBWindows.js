/* global define: true, Windows: true  */

// Require winusb.sys driver - windows 8

define(function (require, exports, module) {
   "use strict"; 
    
    var USBDevice = require('usb/USBDevice');
       
    function USBWindows(options) {
      
        USBDevice.call(this,options);
        
        if (options)
            this.log.log('log','USB options',options);
        
        this._deviceWatchers = [];
        
    }
    
    USBWindows.prototype = Object.create(USBDevice.prototype, { constructor : { value : USBWindows,
                                                                            enumerable : false,
                                                                            writeable : true,
                                                                            configurable : true } });
    USBWindows.prototype._initializeDeviceWatcher = function ()
    {
         var ANTSelector = Windows.Devices.Usb.UsbDevice.getDeviceSelector(this.options.vid, this.options.pid);

        
        var ANTWatcher = Windows.Devices.Enumeration.DeviceInformation.createWatcher(ANTSelector, []);

            // Allow the EventHandlerForDevice to handle device watcher events that relate to or affect our device (i.e. device removal, addition, app suspension/resume)
//            this._addDeviceWatcher(superMuttWatcher, superMuttSelector);
    };
    
    USBWindows.prototype.init = function (callback) {
       this._initializeDeviceWatcher();
    };
    
    USBWindows.prototype.exit = function (callback) {
    
        throw new Error('Not implemented - should be overridden in descendat objects in the prototype chain');
    };
    
        // Sets device timeout in ms.
    USBWindows.prototype.setDeviceTimeout = function (timeout) {
        throw new Error('Func. should be overridden in descendant objects');
    };
    
    USBWindows.prototype.listen = function (successCallback) {
        throw new Error('Func. shoule be overridden in descendant objects');
    };
    
    USBWindows.prototype.transfer = function (chunk, successCallback) {
        throw new Error('Func. shoule be overridden in descendant objects');
    };
});