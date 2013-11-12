/* global define: true, Windows: true  */

// Require winusb.sys driver - windows 8

define(function (require, exports, module) {
    "use strict";


    var USBDevice = require('usb/USBDevice');

    function USBWindows(options) {

        USBDevice.call(this, options);

        // this.chosenDevice = options.device || 0;


        if (options)
            this.log.log('log', 'USB options', options);

      
        if (!options.deviceId)
            this.log.log('warn', 'No default device id specified');
        else
            this.log.log('log', 'Will try to connect to device id ', options.deviceId);



        this.readingPromise = undefined;
        this.writingPromise = undefined;

        this.dataReader = undefined;
        this.dataWriter = undefined;

        this.ANTWatcher = undefined;
        this.ANTdevice = undefined;

        this.enumeratedDevice = [];

       

    }

    USBWindows.prototype = Object.create(USBDevice.prototype, {
        constructor: {
            value: USBWindows,
            enumerable: false,
            writeable: true,
            configurable: true
        }
    });

    // State
    //USBWindows.prototype.STATE = {
    //    PENDING: 1,
    //    FOUND: 2,
    //    NOT_FOUND : 3
    //}

    USBWindows.prototype._tryFindANTDeviceFromKnownDevices = function (deviceInformation)
        {
        // We have no previously configured device, is it a known device?
        // Or previously configured device is not found

                var devNum,
                    knownDevices = this.options.knownDevices;

        // Absolute positioning may not be the best, but may work, TO DO MAYBE : regex
        // ID : \\\\?\\USB#VID_0FCF&PID_1008#150#{dee824ef-729b-4a0e-9c14-b7117d33a817}
        var vid = parseInt(deviceInformation.id.substr(12,4),16)
        var pid = parseInt(deviceInformation.id.substr(21,4),16);

        this.state = "searching_for_device_among_known_devices";

        for (devNum = 0; devNum < knownDevices.length; devNum++) {

            if (knownDevices[devNum].vid === vid && knownDevices[devNum].pid === pid)
            {
              
                // Update current deviceId
                this.options.deviceId = deviceInformation.id;
                        
                this.log.log('log', 'Found '+knownDevices[devNum].name+' with vid ' + vid + ' pid ' + pid + ' among known devices, trying to use this device by convention without involving user');
                Windows.Devices.Usb.UsbDevice.fromIdAsync(deviceInformation.id).then(this._foundANTDevice.bind(this), this._notFoundANTDevice.bind(this));

                 break;
               // return devNum;

            }
        }

       // return undefined;

    };

    USBWindows.prototype._notFoundANTDevice =   function (err) {
        this.state = 'failed_to_find_usbdevice';
        var msg = 'Failed to find USB device from id ' + this.deviceId + ' ' + err.toString();
        this.log.log('error', msg);
        this._initCallback(new Error(msg)); // Using continuation callback-style ala Node

    };

    USBWindows.prototype._foundANTDevice =  function (usbDevice) {
        this.log.log('log', 'Found ANT USB device',usbDevice);

        this.state = 'found_usbdevice';

        var deviceInfoid = this.options.deviceId;

        // deviceAccessStatus based on "Custom USB Access" sample
        var deviceAccessStatus = Windows.Devices.Enumeration.DeviceAccessInformation.createFromId(deviceInfoid).currentStatus;

        switch (deviceAccessStatus) {
            case Windows.Devices.Enumeration.DeviceAccessStatus.deniedByUser:
                this.log.log('error', "USB Device-Access: Access to the device was blocked by the user : " + deviceInfoid);

                break;
            case Windows.Devices.Enumeration.DeviceAccessStatus.deniedBySystem:
                // This status is most likely caused by app permissions (did not declare the device in the app's package.appxmanifest)
                // This status does not cover the case where the device is already opened by another app.
                this.log.log('error', "USB Device-Access: Access to the device was blocked by the system : " + deviceInfoid);

                break;

            case Windows.Devices.Enumeration.DeviceAccessStatus.allowed:
                this.log.log('info', 'USB Device-Access: Access to device allowed by user');
                break;

            case Windows.Devices.Enumeration.DeviceAccessStatus.unspecified:
            default:
                // Most likely the device is opened by another app, but cannot be sure
                this.log.log('error', "USB Device-Access: Unknown error, possibly opened by another app : " + deviceInfoid);

                break;
        }

        if (usbDevice === null) {
            this._initCallback(new Error('Device found, but received no further device handle to get interface'));
            return;
        }

        // Setup datareader/datawriter

        this.ANTdevice = usbDevice;

        if (usbDevice.defaultInterface.bulkInPipes.length >= 1) {
    
            this.dataReader = new Windows.Storage.Streams.DataReader(usbDevice.defaultInterface.bulkInPipes[0].inputStream);
        }
        else {
            this._initCallback(new Error('No in bulk pipe found on interface'));
            return; // Too serious to continue
        }

        if (usbDevice.defaultInterface.bulkOutPipes.length >= 1) {
             
            this.dataWriter = new Windows.Storage.Streams.DataWriter(usbDevice.defaultInterface.bulkOutPipes[0].outputStream);
        }
        else {
          
                this._initCallback(new Error('No out bulk pipe found on interface'));
           
            return;
        }


        
           this._initCallback();

    };

    USBWindows.prototype._getIndexOfEnumeratedDevice = function (deviceInformation) {
        var devNum, len = this.enumeratedDevice.length;
        for (devNum = 0;devNum<len;devNum++)
        {
            if (deviceInformation.id === this.enumeratedDevice[devNum].id)
                return devNum;
        }

        return -1;

    }
  
    USBWindows.prototype._initializeDeviceWatcher = function () {
        // returns an AQS - Advanced Query String for finding the device
        //var ANTSelector = Windows.Devices.Usb.UsbDevice.getDeviceSelector(this.options.vid, this.options.pid);

        // Don't know the interface class for ANT USB2/m stick
        //var winUSBInterfaceClass = "88bae032-5a81-49f0-bc3d-a4ff138216d6";
        //var ANTSelector = Windows.Devices.Usb.UsbDevice.getDeviceSelector(winUSBInterfaceClass);

        // Can be used, but user must select the right device among devices that may not be ANT capable
        var usbDeviceClass = new Windows.Devices.Usb.UsbDeviceClass();
        usbDeviceClass.classCode = 0xFF;
        usbDeviceClass.subclassCode = 0x00;
        usbDeviceClass.protocolCode = 0x00;

        var ANTSelector = Windows.Devices.Usb.UsbDevice.getDeviceClassSelector(usbDeviceClass);


        // http://msdn.microsoft.com/en-us/library/windows/apps/windows.devices.enumeration.devicewatcher
        this.ANTWatcher = Windows.Devices.Enumeration.DeviceInformation.createWatcher(ANTSelector, []);

        var _onAdded = function (deviceInformation) {

            this.log.log('log', deviceInformation.name + ' added (id: ' + deviceInformation.id + ')');

            this.enumeratedDevice.push(deviceInformation);

            // if this matches our search deviceId (last known deviceId), try get a handle for bulk in/out

            if (this.options.deviceId && this.options.deviceId === deviceInformation.id) {

                this.state = "added_getting_usbdevice";
                // Device was added, get handle for bulk in/out
                Windows.Devices.Usb.UsbDevice.fromIdAsync(deviceInformation.id).then(this._foundANTDevice.bind(this), this._notFoundANTDevice.bind(this));

            } else if (!this.options.deviceId) {
                this._tryFindANTDeviceFromKnownDevices(deviceInformation);
               
            }

           

        }.bind(this);


        var _onRemoved = function (deviceInformation) {
            this.log.log('log', 'USB device removed (id: ' + deviceInformation.id + ')');

            // Remove device and free resources

            var removedIndex = this._getIndexOfEnumeratedDevice(deviceInformation);

            if (removedIndex !== -1)
              this.enumeratedDevice.splice(removedIndex, 1);

            if (this.options.deviceId && this.options.deviceId === deviceInformation.id) {

                this.releaseDevice();
            }
            

        }.bind(this);

        var _onUpdated = function (deviceInformation) {
            this.log.log('log', deviceInformation.name + ' updated (id: ' + deviceInformation.id + ')');

            var updatedIndex = this._getIndexOfEnumeratedDevice(deviceInformation);

            if (updatedIndex !== -1)
               this.enumeratedDevice[updatedIndex] = deviceInformation;

        }.bind(this);


        var _onEnumerationComplete = function (event) {

            this.log.log('log', 'USB device enumeration complete, found ' + this.enumeratedDevice.length + ' devices');

           

            // TEST stopped state : this.ANTWatcher.stop();


        }.bind(this);

        var _onStopped = function (event) {
            this.enumeratedDevice = [];
            this.log.log('log', 'Stopped ANT USB device watching');
        }.bind(this);

     

        this.ANTWatcher.addEventListener("added", _onAdded);
        this.ANTWatcher.addEventListener("removed", _onRemoved);
        this.ANTWatcher.addEventListener("updated", _onUpdated);
        this.ANTWatcher.addEventListener("enumerationcompleted", _onEnumerationComplete);
        this.ANTWatcher.addEventListener("stopped", _onStopped);

        // If requested add more device listeners, i.e UI
        if (typeof this.options.deviceWatcher !== "undefined") {

            if (typeof this.options.deviceWatcher.onAdded === 'function')
                this.ANTWatcher.addEventListener("added", this.options.deviceWatcher.onAdded);

            if (typeof this.options.deviceWatcher.onRemoved === 'function')
                this.ANTWatcher.addEventListener("removed", this.options.deviceWatcher.onRemoved);

            if (typeof this.options.deviceWatcher.onUpdated === 'function')
                this.ANTWatcher.addEventListener("updated", this.options.deviceWatcher.onUpdated);

            if (typeof this.options.deviceWatcher.onEnumerationCompleted === 'function')
                this.ANTWatcher.addEventListener("enumerationcompleted", this.options.deviceWatcher.onEnumerationCompleted);

            if (typeof this.options.deviceWatcher.onStopped === 'function')
                this.ANTWatcher.addEventListener("stopped", this.options.deviceWatcher.onStopped);
        }

        this.ANTWatcher.start();

    };

    // For access to ANT device watcher, maybe for attaching UI-eventlisteners
    USBWindows.prototype.getDeviceWatcher = function () {
        return this.ANTWatcher;
    }



    USBWindows.prototype.init = function (callback) {

        // Enable sharing of callback for all methods
        this._initCallback = callback;

      //  if (!this.ANTWatcher)
            this._initializeDeviceWatcher();
        //else {
        //    // i.e resume application from suspended state
        //    this.ANTWatcher.start();
        //    callback();
        //}

    };

    USBWindows.prototype.releaseDevice = function () {
        // Stop any I/O that may currently by active on the device
        this.log.log('log', 'Canceling reading on ANT in endpoint');

        if (this.readingPromise) {
            this.readingPromise.cancel();
            //this.readingPromise = undefined;
           
        }

        this.log.log('log', 'Canceling writing to ANT out endpoint');
        if (this.writingPromise) {
            this.writingPromise.cancel();
            //this.writingPromise = undefined;
            // this.dataWriter.close();
            // this.dataWriter = null;
        }

        // Attempt release of resources
        //if (this.dataReader) {

        //    this.dataReader.close();
        //   // this.dataReader = undefined;
        //}

        //if (this.dataWriter) {
        //    this.dataWriter.close();
        //    //this.dataWriter = undefined;
        //}



        if (this.ANTdevice) {
            this.log.log('log', 'Closing ANT device');
            this.ANTdevice.close();
            //this.ANTdevice = undefined;
        }
    }

    USBWindows.prototype.exit = function () {

        // Stop wathcing from ANT devices



        if (this.ANTWatcher)
            this.ANTWatcher.stop();

        this.releaseDevice();
        
       // callback();

    };

    // Sets device timeout in ms.
    USBWindows.prototype.setDeviceTimeout = function (timeout) {
        throw new Error('Func. should be overridden in descendant objects');
    };

    USBWindows.prototype.listen = function (rxParser) {

        var transferErrorCount = 0,
            MAX_TRANSFER_ERROR_COUNT = 10,
            MAX_IN_PACKET_SIZE,
            REQUESTED_TRANSFER_SIZE;

        var success = function _success(bytesRead) {

            var iBuffer = this.dataReader.readBuffer(bytesRead);
            var buf = new Uint8Array(iBuffer);  // Convet from Windows.Storage.Streams.Ibuffer to Uint8Array
            this.log.log('log', "Rx", buf, bytesRead + ' bytes read');
            rxParser(undefined, buf);

            retry();

        }.bind(this);

        var error = function _error(err) {
            this.log.log('error', 'RX', err, err.stack);
            transferErrorCount++;
            if (transferErrorCount < MAX_TRANSFER_ERROR_COUNT)
                retry();
            else
                this.log.log('error', 'Too many failed attempts to read from device, reading stopped');

        }.bind(this);

        var retry = function _bulkInTransfer() {
            try {
                //delete this.readingPromise;
                this.readingPromise = this.dataReader.loadAsync(REQUESTED_TRANSFER_SIZE).then(success, error);

            }
            catch (e) {
                //this.log.log('error', 'Failed loadAsync', e);
                //transferErrorCount++;
                //if (transferErrorCount < MAX_TRANSFER_ERROR_COUNT)
                //    retry();
                //else

                this.log.log('error', 'Failed loadAsync ANT -> HOST', e);

            }
        }.bind(this);
        
        MAX_IN_PACKET_SIZE = this.ANTdevice.defaultInterface.bulkInPipes[0].endpointDescriptor.maxPacketSize || 64;
        REQUESTED_TRANSFER_SIZE = this.options.length.in || MAX_IN_PACKET_SIZE

        this.log.log('log', 'Requested transfer size on in endpoint is ' + REQUESTED_TRANSFER_SIZE + ' bytes');

        retry();

        //return bulkPipes.readingPromise;

    };

    USBWindows.prototype.transfer = function (chunk, callback) {
        // At the moment : Higher level code in anthost will attempt resend of message if no response is received

        try 
        {
            if (this.dataWriter)
                this.dataWriter.writeBytes(chunk);
            else
            {
                callback(new Error('No data writer available, cannot transfer USB data '))
                //this.log.log('error', 'Tx - No data writer available');
                //return;
            }
        } catch (e) {
            this.log.log('error', 'Failed writeBytes to dataWriter for ANT USB', e);
            callback(e);
        }

        var success = function _success(bytesWritten) {
            this.log.log('log', 'Tx', chunk, bytesWritten + ' bytes written');
            callback();
        }.bind(this),

            error = function _error(err) {
                this.log.log('error', 'Tx', err);
                callback(err);
            }.bind(this);

        var retry = function _retry() {
            try {
               // delete this.writingPromise;
                this.writingPormise = this.dataWriter.storeAsync().then(success, error);
            } catch (e) {
                this.log.log('error', 'Failed storeAsync HOST -> ANT', e);
            }
        }.bind(this);

        retry();

    };

    module.exports = USBWindows;
    return module.exports;
});