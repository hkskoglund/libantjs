"use strict"
var USBDevice = require('./USBDevice.js'),
    usb = require('usb'),
    ANT = require('ant-lib'),
    Duplex = require('stream').Duplex;

function initStream() {

    var endpointPacketSize = this.getEndpointPacketSize();

    this._stream = new Duplex();

    // Rx: 
    this._stream._read = function () {
        //console.trace();
        console.log("USBDevice _read", arguments);
    }.bind(this);

    // TX: Everything that should be written to the ANT chip goes via this stream
    this._stream._write = function (payload, encoding, nextCB) {
        var buf;

        console.log("USBDevice _write", arguments);
        // Loopback test : this._stream.push(new Buffer([1, 2, 3, 4]));
        // node.js - wants to minimize internal buffer on streams (lower RAM usage)
        // but now I want to maximize the amount of bytes written to the ANT chip  
        // to saturate receive buffers in ANT CHIP for bursts, so it seems like I have to have a separate buffer here
        if (this.burstMode &&  (this._burstBuffer.length + payload.length) < endpointPacketSize) {

            this._burstBuffer = Buffer.concat([this._burstBuffer, payload]);
            console.log("Buffering ", payload, " burst buffer is now:", this._burstBuffer);
        }
        else if (this.burstMode) {
            console.log("Write burst to ANT chip now");
            this.write(this._burstBuffer, nextCB);
        }
       

        //nextCB();
    }.bind(this);

}
function USBNode() {
    USBDevice.call(this);

    this.addListener(USBNode.prototype.EVENT.LOG, this.showLogMessage);
    this.addListener(USBNode.prototype.EVENT.ERROR, this.showLogMessage);

  

    this.setBurstMode(false);


}

USBNode.prototype = Object.create(USBDevice.prototype);

USBNode.prototype.constructor = USBNode; // Otherwise constructor = USBDevice ...

USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE = 64;  // Based on info in nRF24AP2 data sheet

USBNode.prototype.ANT_DEVICE_TIMEOUT = 5; // Direct USB ANT communication  (normal 5-7 ms. processing time on device)

USBNode.prototype.getStream = function () {
    return this._stream;
}

USBNode.prototype.getEndpointPacketSize = function () {
    return this.device.deviceDescriptor.bMaxPacketSize0; // 32
    //return USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
},

USBNode.prototype.setDirectANTChipCommunicationTimeout = function (timeout)
{
    this.setDeviceTimeout(timeout || USBNode.prototype.ANT_DEVICE_TIMEOUT);
}

USBNode.prototype.setDeviceTimeout = function (timeout) {
    this.device.timeout = timeout;
}

USBNode.prototype.isTimeoutError = function (error) {
    return (error.errno === usb.LIBUSB_TRANSFER_TIMED_OUT);
}

USBNode.prototype.init = function (idVendor, idProduct, nextCB) {
    var
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

    this.device = usb.findByIds(idVendor, idProduct);
   // TEST this.device = undefined;

    if (typeof this.device === "undefined") {
        err = new Error("Could not find USB ANT device vendor id:" + this.idVendor + " product id.:" + this.idProduct);
        this.emit(USBDevice.prototype.EVENT.ERROR, err);
        nextCB(err);
        //throw err; 
        //return;
        //errorCallback();
    } 

        this.emit(USBDevice.prototype.EVENT.LOG, "USB ANT device found vendor 0x" + this.idVendor.toString(16) + "/" + this.idVendor + " product 0x" + this.idProduct.toString(16) + "/" + this.idProduct + " on bus " + this.device.busNumber + " address " + this.device.deviceAddress);

        //+ ", max packet size endpoint 0/control: " + this.device.deviceDescriptor.bMaxPacketSize0 + " bytes, default transfer timeout ms.: " + this.device.timeout + ", packet size endpoints in/out 64 bytes");

        //console.log("Opening interface on device GARMIN USB2 ANT+ wireless/nRF24AP2 (Dynastream Innovations Inc.)");
        //console.log("Vendor id: " + this.idVendor + " Product id: " + this.idProduct);

        this.device.open(); // Init/get interfaces of device
        //console.log("Default timeout for native libusb transfer is :" + ant.timeout);

        antInterface = this.device.interface();
    // TEST  antInterface = undefined;
        if (typeof antInterface === "undefined") {
            err = new Error("Could not get interface to ANT device, aborting");
            this.emit(USBDevice.prototype.EVENT.ERROR, err);
            nextCB(err);
            //throw err;
            //return;
            //errorCallback();
        }
        //else {
        //   console.log("Found default interface, it has " + this.antInterface.endpoints.length + " endpoints ");
        //}

        if (antInterface.endpoints.length < 2) {
            err = new Error("Normal operation require 2 endpoints for in/out communication with ANT device");
            this.emit(USBDevice.prototype.EVENT.ERROR, err);
            nextCB(err); // Let higher level API get a chance to deal with the error
            //throw err;
            //return;
            //errorCallback();
        }

        // http://www.beyondlogic.org/usbnutshell/usb5.shtml
        this.inEP = antInterface.endpoints[0]; // Control endpoint
        //if (this.inEP.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK)
        //    inTransferType = "BULK (" + this.inEP.transferType + ')';

        this.outEP = antInterface.endpoints[1];
        //if (this.outEP.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK)
        //    outTransferType = "BULK (" + this.outEP.transferType + ')';

        // Shared endpoint number in/control and out
        // console.log("Number for endpoint: " + (this.inEP.address & 0xF) + " Control/in " + inTransferType + " - " + (this.outEP.address & 0xF) + " " + this.outEP.direction + " " + outTransferType);

        // console.log("Claiming interface");
        antInterface.claim(); // Must call before attempting transfer on endpoints

        this.emit(USBDevice.prototype.EVENT.LOG, "Endpoint 0 (bMaxPacketSize0 descriptor) packet size is "+this.device.deviceDescriptor.bMaxPacketSize0+" bytes");


        //this.listen();

        //  console.log("Cleaning LIBUSB in endpoint buffers....");

    //console.log("THIS IS NOW", this);

    //console.log(drainLIBUSB);

        initStream.bind(this)();

        drainLIBUSB.bind(this)(function _drainLIBUSBCB(error, totalBytesDrained) {

            if (totalBytesDrained > 0)
                this.emit(USBDevice.prototype.EVENT.LOG, 'Drained ' + totalBytesDrained + ' from in endpoint');

            if (typeof nextCB === "function") {
                nextCB(error);
            }

        }.bind(this));

}



USBNode.prototype.exit = function (nextCB) {
    //console.log(Date.now(), "Exiting USBNODE now.");

   // console.trace();

    function releaseInterfaceCloseDevice()  {

        this.device.interface().release(function (error) {
            if (error)
                this.emit(USBDevice.prototype.EVENT.ERROR, error);
            else {
                //console.log("Closing device, removing interface, exiting...");
                this.device.close();
                if (typeof nextCB === "function")
                    nextCB();
            }
        });
    };

    if (this.inTransfer) {
        //console.log("Canceling transfer on in endpoint");
        this.inTransfer.cancel(); 
    }

    if (this.outTransfer) {
        // console.log("Canceling transfer on out endpoint");
        this.outTransfer.cancel();
    }

    drainLIBUSB.bind(this)(releaseInterfaceCloseDevice.bind(this));

}

// Private func. -> not accessible on USBNode.prototype
function drainLIBUSB(nextCB) {

    var totalBytesDrained = 0,
        drainAttempt = 0,
        MaxDrainAttemps = 5;

    this.setDirectANTChipCommunicationTimeout();

    // In case we already are listening on in endpoint, cancel it please
    if (this.inTransfer)
        this.inTransfer.cancel();

    function retry() {

        drainAttempt++;
        //console.log("Drain attempt", drainAttempt);

        this.inTransfer = this.inEP.transfer(USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE, function (error, data) {

            if (data.length > 0)
                totalBytesDrained += data.length;

            if (drainAttempt < MaxDrainAttemps) {

                process.nextTick(retry.bind(this)); // Should be the highest priority
            }
            else {
                //console.log("DRAINING FINISHED", totalBytesDrained);
                nextCB(error, totalBytesDrained);
            }
        }.bind(this));
    }

    retry.bind(this)();

};


// "There is no flow control for data transmitted from ANT to host, therefore the Host controller must be able to receive data at any time" p. 8 of
// Interfacing with ANT general purpose chipsets and modules rev 2.1 -> setup a read that never times out on in endpoint
USBNode.prototype.listen = function (nextCB) {
    var INFINITY = 0;
    //console.log("USB LISTEN");
    //console.trace();

    this.setDeviceTimeout(INFINITY);

        try {

            this.inTransfer = this.inEP.transfer(USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE, function (error, data) {
                console.log("IN USB error,data", error, data);
                if (data && data.length > 0)
                    this._stream.push(data); // RX

                nextCB(error,data);
            }.bind(this));
        } catch (error) {
            //if (error.errno === -1) // LIBUSB_ERROR_IO 
            //    {
            this.emit(USBDevice.prototype.EVENT.LOG, 'I/O error - Attempt to read from USB ANT generated an serious input error');
            this.emit(USBDevice.prototype.EVENT.ERROR, error);
            nextCB(error);
        }
    //}

    //retry.bind(this)();
}

USBNode.prototype.write = function (chunk, nextCB)
{
    //console.trace();

    var sendAttempt = 1,
        MAXATTEMPT = 5,
        err;

   
    function retry() {
        //console.trace();
        try {
            this.outTransfer = this.outEP.transfer(chunk, function _outTransferCallback(error) {
                 // Test LIBUSB transfer error
                //error = {};
                //if (sendAttempt === 3)
                //    error.errno = usb.LIBUSB_TRANSFER_CANCELLED;
                //else
                //    error.errno = usb.LIBUSB_TRANSFER_ERROR;

                if (error) { // LIBUSB errors
               
                    this.emit(USBDevice.prototype.EVENT.ERROR, error);

                    if (error.errno !== usb.LIBUSB_TRANSFER_CANCELLED) {
                        if (sendAttempt <= MAXATTEMPT) {
                            setTimeout(function _retryTimeoutTX() {
                                this.emit(USBDevice.prototype.EVENT.LOG, new Error("TX: Retry sending " + sendAttempt));
                                sendAttempt++;

                                // http://stackoverflow.com/questions/15349733/setimmediate-vs-nexttick
                                //setImmediate(retry);  
                                process.nextTick(retry.bind(this));
                                //retry();
                            }, this.device.timeout);
                        } else {
                            err = new Error('TX: Max. retry attempts reached');
                            this.emit(USBDevice.prototype.EVENT.ERROR,err );

                            nextCB(err); // Allow proceed...
                        }
                    } else 
                        nextCB(error); // Transfer cancelled
                }
                else 
                    nextCB();
            }.bind(this));
        } catch (error) {
            this.emit(USBDevice.prototype.EVENT.LOG, "I/O error - Attempt to write to USB ANT chip generated an serious output error ");
            this.emit(USBDevice.prototype.EVENT.ERROR, error);
            nextCB(error);
        }
    }

    retry.bind(this)();
}

module.exports = USBNode;