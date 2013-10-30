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
          
         //var i = _getIndexOf(this.device, deviceInformation);

         var newLength = this.device.push({ deviceInformation: deviceInformation });
         if (this.chosenDevice === newLength - 1)
             useChosenDevice();

        

      }.bind(this);


      var _onRemoved = function (deviceInformation) {
          this.log.log('log', 'USB device removed (id: ' + deviceInformation.id + ')');

          var i = _getIndexOf(this.device, deviceInformation);

          if (i !== -1) {
              this.device.splice(i, 1);
              if (i === this.chosenDevice) {
                  // Attempt release of resources
                  if (this.dataReader) {
                      this.dataReader.close();

                      if (this.dataWriter)
                          this.dataWriter.close();
                  }
              }
          }
         
      }.bind(this);

      var _onUpdated = function (deviceInformation) {
          this.log.log('log', deviceInformation.name + ' updated (id: ' + deviceInformation.id + ')');

          var i = _getIndexOf(this.device, deviceInformation);

          if (i !== -1)
              this.device[i].deviceInformation = deviceInformation;

      }.bind(this);

      var foundUSBDevice = function _success(usbDevice) {
          //this.log.log('log', usbDevice);

          var deviceInfoid = this.device[this.chosenDevice].deviceInformation.id;

          // deviceAccessStatus based on "Custom USB Access" sample
          var deviceAccessStatus = Windows.Devices.Enumeration.DeviceAccessInformation.createFromId(deviceInfoid).currentStatus;

          switch (deviceAccessStatus) {
              case Windows.Devices.Enumeration.DeviceAccessStatus.deniedByUser:
                  this.log.log('error', "Access to the device was blocked by the user : " + deviceInfoid);

                  break;
              case Windows.Devices.Enumeration.DeviceAccessStatus.deniedBySystem:
                  // This status is most likely caused by app permissions (did not declare the device in the app's package.appxmanifest)
                  // This status does not cover the case where the device is already opened by another app.
                  this.log.log('error', "Access to the device was blocked by the system : " + deviceInfoid);

                  break;

              case Windows.Devices.Enumeration.DeviceAccessStatus.allowed:
                  this.log.log('log', 'Access to device allowed by user');
                  break;

              case Windows.Devices.Enumeration.DeviceAccessStatus.unspecified:
              default:
                  // Most likely the device is opened by another app, but cannot be sure
                  this.log.log('error', "Unknown error, possibly opened by another app : " + deviceInfoid);

                  break;
          }

          if (usbDevice === null)
          {
              callback(new Error('Device found, but received no further device handle to get interface'));
              return;
          }

          this.device[this.chosenDevice].usbDevice = usbDevice;

          if (usbDevice.defaultInterface.bulkInPipes.length >= 1) {

              this.device[this.chosenDevice].bulkInPipe = usbDevice.defaultInterface.bulkInPipes[0];
              this.dataReader = new Windows.Storage.Streams.DataReader(this.device[this.chosenDevice].bulkInPipe.inputStream);
          }
          else {
              callback(new Error('No in bulk pipe found on interface'));
              return; // Too serious to conitnue
          }

          if (usbDevice.defaultInterface.bulkOutPipes.length >= 1) {
              this.device[this.chosenDevice].bulkOutPipe = usbDevice.defaultInterface.bulkOutPipes[0];
              this.dataWriter = new Windows.Storage.Streams.DataWriter(this.device[this.chosenDevice].bulkOutPipe.outputStream);
          }
          else {
              callback(new Error('No out bulk pipe found on interface'));
              return;
          }

         
          callback();

      }.bind(this);

      var notFoundUSBDevice = function _error(err) {
          var msg = 'Failed to find USB device from id ' + this.device[this.chosenDevice].deviceInformation.id + ' ' + err.toString();
          this.log.log('error', msg);
          callback(new Error(msg)); // Using continuation callback-style ala Node

      }.bind(this);

      var useChosenDevice = function () {
          
          if (this.device.length > 0 && this.device[this.chosenDevice]) {

              Windows.Devices.Usb.UsbDevice.fromIdAsync(this.device[this.chosenDevice].deviceInformation.id).then(foundUSBDevice, notFoundUSBDevice);

          } else {
              if (this.device.length === 0)
                  callback(new Error('Failed to find any ANY device'));
              else if (!this.device[this.chosenDevice])
                  callback(new Error('Failed to find ANT device '+this.chosenDevice));
          }
      }.bind(this);

      var _onEnumerationComplete = function (event) {
          this.log.log('log', 'USB device enumeration complete, found ',this.device.length,' ANT devices');
          // TEST stopped state : this.ANTWatcher.stop();
        
         
      }.bind(this);

      var _onStopped = function (event) {
          this.log.log('log', 'Stopped USB device watching');
      }.bind(this);

        // Private
      function _getIndexOf(deviceArr, deviceInformation) {

          for (var i = 0; i < deviceArr.length; i++)
              if (deviceArr[i].deviceInformation.id === deviceInformation.id)
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
       
        var transferErrorCount = 0,
            MAX_TRANSFER_ERROR_COUNT = 10;

        var success =  function _success(bytesRead) {

            var iBuffer = this.dataReader.readBuffer(bytesRead);
            var buf = new Uint8Array(iBuffer);  // Convet from Windows.Storage.Streams.Ibuffer to Uint8Array
            this.log.log('log', "Rx", buf );
            rxParser(undefined, buf);

            retry();

        }.bind(this);

        var error = function _error(err) {
            this.log.log('error', 'RX', err);
            transferErrorCount++;
            if (transferErrorCount < MAX_TRANSFER_ERROR_COUNT)
                retry();
            else
                this.log.log('error', 'Too many failed attempts to read from device, reading stopped');

        }.bind(this);

        var retry = function _bulkInTransfer() {
            try {
                this.readingPromise = this.dataReader.loadAsync(this.options.length.in || 64).then(success, error);
            }
            catch (e)
            {
                this.log.log('error', 'Failed loadAsync', e);
                transferErrorCount++;
                if (transferErrorCount < MAX_TRANSFER_ERROR_COUNT)
                    retry();
                else
                    this.log.log('error','Too many attempts to loadAsync bulk data from in endpoint, stopping');
                

            }
                    }.bind(this);

        retry();

        //return bulkPipes.readingPromise;

    };
    
    USBWindows.prototype.transfer = function (chunk, callback) {
       // At the moment : Higher level code in anthost will attempt resend of message if no response is received

        this.dataWriter.writeBytes(chunk);

        var success = function _success(bytesWritten) {
            this.log.log('log', 'Tx', chunk);
            callback();
        }.bind(this),

            error =  function _error(err) {
                this.log.log('error', 'Tx', err);
                callback(err);
            }.bind(this);

        var retry = function _retry() {
            try {
                this.writingPormise = this.dataWriter.storeAsync().then(success, error);
            } catch (e)
            {
                this.log.log('error', 'Failed to storeAsync', e);
            }
        }.bind(this);

        retry();

    };
    
    module.exports = USBWindows;
    return module.exports;
});