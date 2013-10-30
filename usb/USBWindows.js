/* global define: true, Windows: true  */

// Require winusb.sys driver - windows 8

define(function (require, exports, module) {
   "use strict"; 
    
  
   var USBDevice = require('usb/USBDevice');
       
   function USBWindows(options) {

       USBDevice.call(this, options);

       this.chosenDevice = options.device || 0;
      
        
        if (options)
            this.log.log('log', 'USB options', options);

        // Found devices by the device watcher
        this.device = [];

    }
    
    USBWindows.prototype = Object.create(USBDevice.prototype, { constructor : { value : USBWindows,
                                                                            enumerable : false,
                                                                            writeable : true,
                                                                            configurable : true } });
    USBWindows.prototype._initializeDeviceWatcher = function (callback)
    {
      // returns an AQS - Advanced Query String for finding the device
      var ANTSelector = Windows.Devices.Usb.UsbDevice.getDeviceSelector(this.options.vid, this.options.pid);
      
        // http://msdn.microsoft.com/en-us/library/windows/apps/windows.devices.enumeration.devicewatcher
      this.ANTWatcher = Windows.Devices.Enumeration.DeviceInformation.createWatcher(ANTSelector, []);

      var _onAdded = function (deviceInformation) {
          this.log.log('log', deviceInformation.name + ' added (id: ' + deviceInformation.id + ')');
          this.device.push({ deviceInformation: deviceInformation });
      }.bind(this);


      var _onRemoved = function (deviceInformation) {
          this.log.log('log', 'USB device removed (id: ' + deviceInformation.id + ')');

          var i = _getIndexOf(this.device, deviceInformation);

          if (i !== -1)
              this.device.splice(i, 1);

      }.bind(this);

      var _onUpdated = function (deviceInformation) {
          this.log.log('log', deviceInformation.name + ' updated (id: ' + deviceInformation.id + ')');

          var i = _getIndexOf(this.device, deviceInformation);

          if (i !== -1)
              this.device[i].deviceInformation = deviceInformation;

      }.bind(this);

      var _onEnumerationComplete = function (event) {
          this.log.log('log', 'USB device enumeration complete');
          // TEST stopped state : this.ANTWatcher.stop();

          var foundUSBDevice = function _success(usbDevice) {
              this.log.log('log', usbDevice); 
              this.device[this.chosenDevice].usbDevice = usbDevice;

              if (usbDevice.defaultInterface.bulkInPipes.length >= 1) {
                 
                  this.device[this.chosenDevice].bulkInPipe = usbDevice.defaultInterface.bulkInPipes[0];
                  this.dataReader = new Windows.Storage.Streams.DataReader(this.device[this.chosenDevice].bulkInPipe.inputStream);
              }
              else
                  callback(new Error('No in bulk pipe found on interface'));

              if (usbDevice.defaultInterface.bulkOutPipes.length >= 1) {
                  this.device[this.chosenDevice].bulkOutPipe = usbDevice.defaultInterface.bulkOutPipes[0];
                  this.dataWriter = new Windows.Storage.Streams.DataWriter(this.device[this.chosenDevice].bulkOutPipe.outputStream);
              }
              else
                  callback(new Error('No out bulk pipe found on interface'));

              callback();
                     
          }.bind(this);

          var notFoundUSBDevice = function _error(err)
          {
              var msg = 'Failed to find USB device from id ' + this.device[this.chosenDevice].deviceInformation.id +' '+ err.toString();
              this.log.log('error', msg);
              callback(new Error(msg)); // Using continuation callback-style ala Node

          }.bind(this);
         
            if (this.device.length > 0) {
             
                Windows.Devices.Usb.UsbDevice.fromIdAsync(this.device[this.chosenDevice].deviceInformation.id).then(foundUSBDevice, notFoundUSBDevice);

            }
              

      }.bind(this);

      var _onStopped = function (event) {
          this.log.log('log', 'Stopped USB device watching');
      }.bind(this);

        // Private
      function _getIndexOf(deviceArr, deviceInformation) {

          for (var i = 0; i < deviceArr; i++)
              if (deviceArr[i].id === deviceInformation.id)
                  return i;

          return -1;
      }

      this.ANTWatcher.addEventListener("added", _onAdded);

      this.ANTWatcher.addEventListener("removed", _onRemoved);
      this.ANTWatcher.addEventListener("updated", _onUpdated);
      this.ANTWatcher.addEventListener("enumerationcompleted", _onEnumerationComplete);
      this.ANTWatcher.addEventListener("stopped", _onStopped);

      this.ANTWatcher.start();

    };

    // For access to ANT device watcher, maybe for attaching UI-eventlisteners
    USBWindows.prototype.getDeviceWatcher = function () {
        return this.ANTWatcher;
    }

    
    
    USBWindows.prototype.init = function (callback) {
        
        this._initializeDeviceWatcher(callback);
    
    };
    
    USBWindows.prototype.exit = function (callback) {

        if (this.ANTWatcher)
            this.ANTWatcher.stop().done(callback);
     
    };
    
        // Sets device timeout in ms.
    USBWindows.prototype.setDeviceTimeout = function (timeout) {
        throw new Error('Func. should be overridden in descendant objects');
    };
    
    USBWindows.prototype.listen = function (rxParser) {
       

        var success =  function _success(bytesRead) {

            var iBuffer = this.dataReader.readBuffer(bytesRead);
            var buf = new Uint8Array(iBuffer);  // Convet from Windows.Storage.Streams.Ibuffer to Uint8Array
            this.log.log('log', "Rx", buf );
            rxParser(undefined, buf);

            retry();

        }.bind(this);

        var error = function _error(err) {
            this.log.log('error', 'RX', err);
        }.bind(this);

        var retry = function _bulkInTransfer() {
                        this.readingPromise = this.dataReader.loadAsync(this.options.length.in || 64).then(success, error);
                    }.bind(this);

        retry();

        //return bulkPipes.readingPromise;

    };
    
    USBWindows.prototype.transfer = function (chunk, successCallback) {
       

        this.dataWriter.writeBytes(chunk);

        var success = function _success(bytesWritten) {
            this.log.log('log', 'Tx', chunk);
        }.bind(this),

            error =  function _error(err) {
                this.log.log('error', 'Tx', err);
            }.bind(this);

        this.writingPormise = this.dataWriter.storeAsync().then(success, error);

    };
    
    module.exports = USBWindows;
    return module.exports;
});