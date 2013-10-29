/* global define: true, Windows: true  */

// Require winusb.sys driver - windows 8

define(function (require, exports, module) {
   "use strict"; 
    
  
   var USBDevice = require('usb/USBDevice');
       
    function USBWindows(options) {
      
        USBDevice.call(this,options);
        
        if (options)
            this.log.log('log', 'USB options', options);

        // Found devices by the device watcher
        this.device = [];
     
    }
    
    USBWindows.prototype = Object.create(USBDevice.prototype, { constructor : { value : USBWindows,
                                                                            enumerable : false,
                                                                            writeable : true,
                                                                            configurable : true } });
    USBWindows.prototype._initializeDeviceWatcher = function ()
    {
      // returns an AQS - Advanced Query String for finding the device
      this.ANTSelector = Windows.Devices.Usb.UsbDevice.getDeviceSelector(this.options.vid, this.options.pid);
      
        // http://msdn.microsoft.com/en-us/library/windows/apps/windows.devices.enumeration.devicewatcher
      this.ANTWatcher = Windows.Devices.Enumeration.DeviceInformation.createWatcher(this.ANTSelector, []);

      this.ANTWatcher.addEventListener("added", this._onAdded.bind(this));
      this.ANTWatcher.addEventListener("removed", this._onRemoved.bind(this));
      this.ANTWatcher.addEventListener("updated", this._onUpdated.bind(this));
      this.ANTWatcher.addEventListener("enumerationcompleted", this._onEnumerationComplete.bind(this));
      this.ANTWatcher.addEventListener("stopped", this._onStopped.bind(this));

      this.ANTWatcher.start();

    };

    USBWindows.prototype._onAdded = function (deviceInformation) {
        this.log.log('log', deviceInformation.name + ' added (id: '+deviceInformation.id+')');
        this.device.push(deviceInformation);
    };

    // Private
    function _getIndexOf(deviceArr, deviceInformation) {

        for (var i = 0; i < deviceArr; i++) 
            if (deviceArr[i].id === deviceInformation.id) 
                return i;

            return -1;
    }

    USBWindows.prototype._onRemoved = function (deviceInformation) {
        this.log.log('log', 'USB device removed (id: '+deviceInformation.id+')');

        var i = _getIndexOf(this.device,deviceInformation);
               
        if (i !== -1)
            this.device.splice(i, 1);
       
    };

    USBWindows.prototype._onUpdated = function (deviceInformation) {
        this.log.log('log', deviceInformation.name + ' updated (id: ' + deviceInformation.id + ')');
       
        var i = _getIndexOf(this.device,deviceInformation);

        if (i !== -1)
            this.device[i] = deviceInformation;
       
    };

    USBWindows.prototype._onEnumerationComplete = function (obj) {
        this.log.log('log', 'USB device enumeration complete');

    };

    USBWindows.prototype._onStopped = function (deviceInformation) {
        this.log.log('log', 'Stopped USB device watching');
    };

    
    USBWindows.prototype.init = function (callback) {
       
        this._initializeDeviceWatcher();
    
    };
    
    USBWindows.prototype.exit = function (callback) {

        if (this.ANTWatcher)
            this.ANTWatcher.stop();
     
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
    
    module.exports = USBWindows;
    return module.exports;
});