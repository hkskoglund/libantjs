"use strict";

define(function (require, exports, module) {
    
function USBChrome() {
}

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
            console.error(Date.now(), "Tx failed", TXinformation);
            callback(new Error(chrome.runtime.lastError));
        }

    }.bind(this);

    var TXinfo = {
        "direction": this.outEP.direction,
        "endpoint": this.outEP.address,
        //"length": this.outEP.maximumPacketSize
        "data" : chunk
    };

    console.log(Date.now(),"TX ", TXinfo);
    chrome.usb.bulkTransfer(this.connectionHandle, TXinfo, onTX);
};

USBChrome.prototype.listen = function (callback) {

    var RXinfo = {
        "direction": this.inEP.direction,
        "endpoint": this.inEP.address | 128, // Raw endpoint address, as reported in bEndpoint descriptor
        "length": this.inEP.maximumPacketSize
    };

    var onRX = function (RXinfo) {
        var data;
        //console.timeEnd('RX');
        if (RXinfo.resultCode === USBChrome.prototype.LIBUSB_TRANSFER_COMPLETED) {
            data =new Uint8Array(RXinfo.data);
            console.log(Date.now(), "Rx", RXinfo, data );
            callback(undefined,data);
        }
        else {
            console.error(Date.now(), "Rx failed, resultCode ", RXinfo.resultCode, chrome.runtime.lastError.message);
            callback(new Error(chrome.runtime.lastError));
        }

        retry.bind(this)();

    }.bind(this);

    function retry() {
        //console.time('RX');
        console.log("retry", this.connectionHandle, RXinfo, onRX);
        chrome.usb.bulkTransfer(this.connectionHandle,RXinfo, onRX);
    }

    console.log(Date.now(), "Listening on RX endpoint, address "+RXinfo.endpoint+", max packet length is "+this.getINendpointPacketSize());

    retry.bind(this)();

    


};

USBChrome.prototype.init = function (idVendor, idProduct, callback) {
    var onData = function (error, data) {
        
        console.log(Date.now(), "Parse RX", error, data);
        if (typeof data === "undefined")
            return;

        var msgId = data[2];

        switch (msgId) {
            case ANTMessage.prototype.MESSAGE.NOTIFICATION_STARTUP:
                console.log("Notification startup");
                break;
            default:
                console.error("Not implemented parsing of msgId", msgId);
                break;
        }

    };

    var onInterfaceClaimed = function () {
        console.log("Interface claimed", this.inEP, this.outEP);
        this.listen(onData);
        callback();
    }.bind(this);

    var onInterfaceFound = function (interfaces) {
        if (interfaces && interfaces.length > 0) {
            console.log("Interface", interfaces[0]);
            if (interfaces[0].endpoints && interfaces[0].endpoints.length > 1) {
                this.inEP = interfaces[0].endpoints[0];
                this.outEP = interfaces[0].endpoints[1];
                chrome.usb.claimInterface(this.connectionHandle, 0, onInterfaceClaimed);
            }
        }
        else
            callback(new Error("Did not find interface of device"));
    }.bind(this),

     onDeviceFound = function (devices) {
        console.log("devices", devices);
        //var devices = devices;
        if (devices) {
            if (devices.length > 0) {
                console.log("Device(s) found: " + devices.length);
                this.connectionHandle = devices[0];
                // chrome.usb.listInterfaces(ConnectionHandle handle, function callback)
                chrome.usb.listInterfaces(devices[0], onInterfaceFound);
            } else 
                callback(new Error("Device could not be found"));
        } else 
            callback(new Error("Did not request correct permissions"));
       
    }.bind(this);

    chrome.usb.findDevices({ "vendorId": idVendor, "productId": idProduct }, onDeviceFound);
};
    
    return USBChrome;
});
