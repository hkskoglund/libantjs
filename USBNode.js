"use strict"
var USBDevice = require('./USBDevice.js'),
    usb = require('usb'),
    ANT = require('ant-lib');

function USBNode() {
    USBDevice.call(this);
    this.addListener(USBNode.prototype.EVENT.LOG, this.showLogMessage);
    this.addListener(USBNode.prototype.EVENT.ERROR, this.showLogMessage);
}

USBNode.prototype = Object.create(USBDevice.prototype);

USBNode.prototype.constructor = USBNode; // Otherwise constructor = USBDevice ...

USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE = 64;  // Based on info in nRF24AP2 data sheet

USBNode.prototype.ANT_DEVICE_TIMEOUT = 5; // Direct USB ANT communication  (normal 5-7 ms. processing time on device)


USBNode.prototype.getEndpointPacketSize = function () {
    return USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
},

USBNode.prototype.setDirectANTChipCommunicationTimeout = function (timeout)
{
    this.setDeviceTimeout(timeout || USBNode.prototype.ANT_DEVICE_TIMEOUT);
}

USBNode.prototype.setDeviceTimeout = function (timeout) {
    this.device.timeout = timeout;
}

USBNode.prototype.init = function (idVendor, idProduct, callback) {
    var self = this,
        antInterface,
        err;
    //console.log("INIT args", arguments);

    //  usb.setDebugLevel(3);
    if (typeof idVendor === "undefined")
        throw new Error("Vendor id not specified");

    if (typeof idProduct === "undefined")
        throw new Error("Product id not specified");

    this.idVendor = idVendor;
    this.idProduct = idProduct;

    //var idVendor = 4047, idProduct = 4104; // Garmin USB2 Wireless ANT+

    self.device = usb.findByIds(idVendor, idProduct);

    if (typeof self.device === "undefined") {
        err = new Error("Could not find USB ANT device vendor id:" + self.idVendor + " product id.:" + self.idProduct);
        self.emit(USBDevice.prototype.EVENT.ERROR, err);
        throw err; 
        //return;
        //errorCallback();
    } 


        self.emit(USBDevice.prototype.EVENT.LOG, "USB ANT device found vendor 0x" + self.idVendor.toString(16) + "/" + self.idVendor + " product 0x" + self.idProduct.toString(16) + "/" + self.idProduct + " on bus " + self.device.busNumber + " address " + self.device.deviceAddress);

        //+ ", max packet size endpoint 0/control: " + self.device.deviceDescriptor.bMaxPacketSize0 + " bytes, default transfer timeout ms.: " + self.device.timeout + ", packet size endpoints in/out 64 bytes");

        //console.log("Opening interface on device GARMIN USB2 ANT+ wireless/nRF24AP2 (Dynastream Innovations Inc.)");
        //console.log("Vendor id: " + self.idVendor + " Product id: " + self.idProduct);

        self.device.open(); // Init/get interfaces of device
        //console.log("Default timeout for native libusb transfer is :" + ant.timeout);

        antInterface = self.device.interface();
        if (typeof antInterface === "undefined") {
            err = new Error("Could not get interface to ANT device, aborting");
            self.emit(USBDevice.prototype.EVENT.ERROR, err);
            throw err;
            //return;
            //errorCallback();
        }
        //else {
        //   console.log("Found default interface, it has " + self.antInterface.endpoints.length + " endpoints ");
        //}

        if (antInterface.endpoints.length < 2) {
            err = new Error("Normal operation require 2 endpoints for in/out communication with ANT device");
            self.emit(USBDevice.prototype.EVENT.ERROR, err);
            throw err;
            //return;
            //errorCallback();
        }

        // http://www.beyondlogic.org/usbnutshell/usb5.shtml
        self.inEP = antInterface.endpoints[0]; // Control endpoint
        //if (self.inEP.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK)
        //    inTransferType = "BULK (" + self.inEP.transferType + ')';

        self.outEP = antInterface.endpoints[1];
        //if (self.outEP.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK)
        //    outTransferType = "BULK (" + self.outEP.transferType + ')';

        // Shared endpoint number in/control and out
        // console.log("Number for endpoint: " + (self.inEP.address & 0xF) + " Control/in " + inTransferType + " - " + (self.outEP.address & 0xF) + " " + self.outEP.direction + " " + outTransferType);

        // console.log("Claiming interface");
        antInterface.claim(); // Must call before attempting transfer on endpoints

        //self.listen();

        //  console.log("Cleaning LIBUSB in endpoint buffers....");

    //console.log("THIS IS NOW", this);

        //console.log(drainLIBUSB);
        drainLIBUSB.bind(this)(function () { if (typeof callback === "function") callback(); });

}



USBNode.prototype.exit = function (callback) {

   // console.trace();

    function releaseInterfaceCloseDevice()  {

        this.device.interface().release(function (error) {
            if (error) this.emit(USBDevice.prototype.EVENT.LOG_MESSAGE, "Problem with release of interface: " + error);
            else {
                //console.log("Closing device, removing interface, exiting...");
                this.device.close();
                if (typeof callback === "function")
                    callback();
            }
        });
    };

    if (this.inTransfer) {
        //console.log("Canceling transfer on in endpoint");
        this.inTransfer.cancel(); // Trigger transferCancelCB
    }

    if (this.outTransfer) {
        // console.log("Canceling transfer on out endpoint");
        this.outTransfer.cancel();
    }

    drainLIBUSB.bind(this)(releaseInterfaceCloseDevice.bind(this));

}

// Private func. -> not accessible on USBNode.prototype
function drainLIBUSB(callback) {
    var totalBytesDrained = 0;

    var successCB = function _scb(data) {
        // TEST - "impossible to drain LIBUSB"
        //data = {};
        //data.length = 10;

        if (typeof data !== "undefined") {
            totalBytesDrained += data.length;
            this.receive(successCB.bind(this)); // As long as there is data available just read it...
        }
            //else {
            //    this.emit(USBDevice.prototype.EVENT.LOG, 'NO bytes drained from LIBUSB in endpoint');
            //}
        else {
            delete this.drainLIBUSB;
            if (totalBytesDrained > 0)
                this.emit(USBDevice.prototype.EVENT.LOG, 'Drained LIBUSB endpoint for ' + totalBytesDrained+ ' bytes');
            callback();
        }
    };

     this.drainLIBUSB = true; // Flag used to silent event handlers when draining....
     this.setDirectANTChipCommunicationTimeout();
     this.receive(successCB.bind(this));
}

USBNode.prototype.receive = function (successCallback) {
   // console.trace();
    console.log("Read timeout is : ", this.device.timeout);
    //console.log("Success callback is : ", successCallback.toString());
    
    
    var receiveAttempt = 1,
        MAXATTEMPT = 5,
        self = this,
        validateSuccessCallback = function _validate(data) {
            //console.log("Validated data", data);
            if (typeof successCallback === "function")
                successCallback(data);
            else {
                //self.emit(USBDevice.prototype.EVENT.LOG, "Success callback is not a function");
                throw new Error("Success callback is not a function");
            }
        };


    function retry() {
        //console.trace();

        function emitEvent(event,msg) {
            if (!self.drainLIBUSB)
                self.emit(event, msg);
        }
       

        try {

            self.inTransfer = self.inEP.transfer(USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE, function (error, data) {
        
                // Test LIBUSB transfer error
                //error = {};
                //if (receiveAttempt === 2)
                //    error.errno = usb.LIBUSB_TRANSFER_CANCELLED;
                //else
                //    error.errno = usb.LIBUSB_TRANSFER_ERROR;

                if (error) { // LIBUSB errors

                
                    emitEvent(USBDevice.prototype.EVENT.ERROR, error);

                    if (error.errno !== usb.LIBUSB_TRANSFER_CANCELLED) {
                        if (receiveAttempt <= MAXATTEMPT) {
                            setTimeout(function _retryTimeoutTX() {
                                emitEvent(USBDevice.prototype.EVENT.LOG, "RX: Retry receiving " + receiveAttempt);
                                receiveAttempt++;

                                setImmediate(retry);
                                //process.nextTick(retry);
                                //retry();
                            }, self.device.timeout);
                        } else {
                            emitEvent(USBDevice.prototype.EVENT.ERROR, 'RX: Max. retry attempts reached');

                            //console.log(successCallback.toString());
                            validateSuccessCallback(undefined); // Allow proceed...
                        }
                    } else {
                        emitEvent(USBDevice.prototype.EVENT.ERROR, 'RX: Transfer cancelled');
                        validateSuccessCallback(undefined);
                    }

                }
                else
                    validateSuccessCallback(data);
            }.bind(self));
        } catch (error) {
            //if (error.errno === -1) // LIBUSB_ERROR_IO 
            //    {
                  delete self.drainLIBUSB;
                  emitEvent(USBDevice.prototype.EVENT.ERROR, "I/O error - Attempt to read from USB ANT generated an serious input error " + error);
              //  }
            process.exit();
        }
    }

    retry();
}

USBNode.prototype.send = function (chunk, successCallback)
{
    //console.trace();

    var sendAttempt = 1,
        MAXATTEMPT = 5,
        self = this,
        validateSuccessCallback = function _validate (data)
        {
            if (typeof successCallback === "function")
                successCallback(data);
            else {
                //self.emit(USBDevice.prototype.EVENT.LOG, "Success callback is not a function");
                throw new Error("Success callback is not a function");
            }
        };

   
    function retry() {
        //console.trace();
        try {
            self.outTransfer = self.outEP.transfer(chunk, function _outTransferCallback(error) {
                 // Test LIBUSB transfer error
                //error = {};
                //if (sendAttempt === 3)
                //    error.errno = usb.LIBUSB_TRANSFER_CANCELLED;
                //else
                //    error.errno = usb.LIBUSB_TRANSFER_ERROR;

                if (error) { // LIBUSB errors
               
                    self.emit(USBDevice.prototype.EVENT.ERROR, error);

                    if (error.errno !== usb.LIBUSB_TRANSFER_CANCELLED) {
                        if (sendAttempt <= MAXATTEMPT) {
                            setTimeout(function _retryTimeoutTX() {
                                self.emit(USBDevice.prototype.EVENT.LOG, "TX: Retry sending " + sendAttempt);
                                sendAttempt++;

                                // http://stackoverflow.com/questions/15349733/setimmediate-vs-nexttick
                                setImmediate(retry);  
                                //process.nextTick(retry);
                                //retry();
                            }, self.device.timeout);
                        } else {
                            self.emit(USBDevice.prototype.EVENT.ERROR, 'TX: Max. retry attempts reached');

                            //console.log(successCallback.toString());
                            validateSuccessCallback(); // Allow proceed...
                        }
                    } else {
                        self.emit(USBDevice.prototype.EVENT.ERROR, 'TX: Transfer cancelled');
                        validateSuccessCallback();
                    }

                }
                else 
                    validateSuccessCallback();
            }.bind(self));
        } catch (error) {
            emitEvent(USBDevice.prototype.EVENT.ERROR, "I/O error - Attempt to write to USB ANT chip generated an serious output error " + error);
            process.exit();
        }
    }

    retry();
}

module.exports = USBNode;