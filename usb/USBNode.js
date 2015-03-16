if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(function(require, exports, module) {

  'use strict';

  var USBDevice = require('./USBDevice.js'),
    usb = require('usb');

  function USBNode(options) {

    USBDevice.call(this, options);

    usb.addListener('attach', this._onAttach.bind(this)); // USB listen for attached listener 'newListener' and  enableHotplugEvents for any devices
    usb.addListener('detach', this._onDetach.bind(this)); // USB listen for detached listener 'removedListener' and disableHotplugEvents for any devices

    usb.addListener('error', this._onError.bind(this));

    this.devices = this.getDevices();

    this.deviceInterface = undefined;

    this.inEndpoint = undefined;
    this.outEndpoint = undefined;

    this._needsKernelDriverAttach = undefined; // For unix/linux

  }

  USBNode.prototype = Object.create(USBDevice.prototype, {
    constructor: {
      value: USBNode,
      enumerable: false,
      writeable: true,
      configurable: true
    }
  });


  USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE = 64; // Based on info in nRF24AP2 data sheet

  USBNode.prototype._onError = function(error) {
    if (this.log.logging) {
      this.log.log(USBDevice.prototype.EVENT.ERROR, error);
    }
  };

  USBNode.prototype._onAttach = function(device) {
    if (this._isANTDevice(device)) {
      device.open(); // Device must be open to execute getDescriptorString call on device object

      this._deviceToString(device, function(err, str) {
        device.close();
        if (this.log.logging) {
          this.log.log(USBDevice.prototype.EVENT.LOG, 'Attached device ' + str);
        }
      }.bind(this));

      this.getDevices();
    }
  };

  USBNode.prototype._getManufacturerAndProduct = function(device, retrn) {

    var manufacturer,
      product;

    device.getStringDescriptor(device.deviceDescriptor.iManufacturer, function _manufacturer(error, data) {

      if (!error) {

        manufacturer = data;
      }

      // THEN

      device.getStringDescriptor(device.deviceDescriptor.iProduct, function _product(error, data) {

        if (!error) {

          product = data;
        }

        retrn(error, {
          'manufacturer': manufacturer,
          'product': product
        });
      });
    });
  };

  USBNode.prototype._onDetach = function(device) {
    if (this._isANTDevice(device)) {


      if (this.log.logging) {
        this.log.log(USBDevice.prototype.EVENT.LOG, 'Detached device ' + this._deviceToString(device));
      }
      this.getDevices();
    }
  };


  USBNode.prototype._deviceToString = function(device, retrn) {
    var str = 'Bus ' + device.busNumber + ' Number ' + device.deviceAddress + ': ID ' + device.deviceDescriptor.idVendor.toString(16) + ':' + device.deviceDescriptor.idProduct.toString(16);

    if (!retrn)
      return str; // Synchronous call doesnt get manufacturer/product descriptor

    // Like lsusb
    this._getManufacturerAndProduct(device,
      function(error, dev) {

        if (!error) {
          if (dev.manufacturer !== undefined) {
            str += ' ' + dev.manufacturer + ',';
          }

          if (dev.product !== undefined) {
            str += ' ' + dev.product;
          }
          retrn(undefined, str);
        } else {
          retrn(error, str);
        }

      });
  };

  USBNode.prototype._isANTDevice = function(usbDevice, index, arr) {
    var knownANTdevices = this.getDevicesFromManifest(),
      match = false,
      descriptor = usbDevice.deviceDescriptor;

    for (var devNr = 0; devNr < knownANTdevices.length; devNr++) {
      if (knownANTdevices[devNr].vendorId === descriptor.idVendor && knownANTdevices[devNr].productId === descriptor.idProduct) {

        match = true;
        break;
      }
    }

    return match;
  };


  USBNode.prototype.getDevices = function() {
    var devices;

    devices = usb.getDeviceList().filter(this._isANTDevice.bind(this));

    this.emit(this.EVENT.ENUMERATION_COMPLETE);

    return devices;
  };

  USBNode.prototype._getINEndpointPacketSize = function() {
    return this.inEndpoint.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
  };

  USBNode.prototype._getOUTEndpointPacketSize = function() {
    return this.outEndpoint.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
  };

  USBNode.prototype.getDirectANTChipCommunicationTimeout = function() {
    return USBNode.prototype.ANT_DEVICE_TIMEOUT;
  };

  // ANT CHIP serial interface configured at 57600 baud (BR pins 1 2 3 = 111) = 57600 bit/s = 57.6 bit/ms
  // Sends : 1 start bit + 8 data bits + 1 stop bits = 10 bit/byte
  // 57.6 bit/ms / 10 bit/byte = 5.76 byte/ms
  // So, f.ex SYNC + MSG L. + MSG ID + 8 bytes payload + CRC = 12 bytes -> 12 bytes / 5.76 bytes/ms = 2.083 ms transfer time
  // 32 bytes transfer : 32 / 5.76 = 5.55 ms, 64 bytes : 2*5.55 = 11.11 ms
  // So a sensible timeout value could be >= 11.11 ms. It's possible to set a dynamic timeout based on how much bytes to transfer, but that needs some computations that takes time
  // dynamictimeout = parseInt(Math.Ceil(chunk/5.76),10)
  USBNode.prototype.setDirectANTChipCommunicationTimeout = function(timeout) {
    this.setDeviceTimeout(timeout || USBNode.prototype.ANT_DEVICE_TIMEOUT);
  };

  USBNode.prototype.setDeviceTimeout = function(timeout) {
    this.device.timeout = timeout;
  };

  USBNode.prototype.isTimeoutError = function(error) {

    return (error.errno === usb.LIBUSB_TRANSFER_TIMED_OUT);
  };

  USBNode.prototype._generateError = function(e, retrn) {
    var err;

    if (!(e instanceof Error)) // USBNode specific error
    {
      err = new Error(e.message);
      err.code = e.code;
    }

    this.emit(USBDevice.prototype.EVENT.ERROR, err);

    retrn(err);

  };

  USBNode.prototype.ERROR = {
    NO_DEVICE: {
      message: 'No device',
      code: -1
    },
    NO_INTERFACE: {
      message: 'No interface',
      code: -2
    },

    USB_TIMEOUT: {
      message: 'Timeout',
      code: -3
    },

    NO_ALLOWDETACHKERNELDRIVER: {
      message: 'OS kernel driver present on interface, no allowDetachKernelDriver option specified, cannot release it',
      code: -4
    }

  };


  USBNode.prototype._claimInterface = function(retrn) {

    this.device.open();

    this.deviceInterface = this.device.interface();

    // Linux can have kernel driver attached to ANT USB; "usb_serial_simple"
    // Can be verified with lsmod | grep usb

    if (this.log.logging) {
      this.log.log(USBDevice.prototype.EVENT.LOG, 'isKernelDriverActive', this.deviceInterface.isKernelDriverActive());
    }

    if (this.deviceInterface.isKernelDriverActive()) {

      if (this.options.allowDetachKernelDriver) {
        if (this.log.logging) {
          this.log.log(USBDevice.prototype.EVENT.LOG, 'Detaching kernel driver');
        }

        this.deviceInterface.detachKernelDriver();

        this._needsKernelDriverAttach = true; // Flag indicates that kernel driver should be reattached on exit
      } else {

        if (this.log.logging) {
          this.log.log(USBDevice.prototype.EVENT.LOG, USBNode.prototype.ERROR.NO_ALLOWDETACHKERNELDRIVER.message);
        }
        retrn(new Error(USBNode.prototype.ERROR.NO_ALLOWDETACHKERNELDRIVER.message));
        return;
      }
    }

    // http://www.beyondlogic.org/usbnutshell/usb5.shtml

    this.inEndpoint = this.deviceInterface.endpoints[0];
    this.inEndpoint.on('error', this._onInEndpointError.bind(this));
    this.inEndpoint.addListener('end', this._onInEndpointEnd.bind(this));

    this.outEndpoint = this.deviceInterface.endpoints[1];
    this.outEndpoint.addListener('error', this._onOutEndpointError.bind(this));
    this.outEndpoint.addListener('end', this._onOutEndpointEnd.bind(this));

    this.deviceInterface.claim(); // Must be called before attempting transfer on endpoints

    retrn();

  };

  USBNode.prototype._onOutEndpointError = function(error) {
    if (this.log.logging) {
      this.log.log(USBDevice.prototype.EVENT.ERROR, 'Out endpoint', error);
    }
  };

  USBNode.prototype._onOutEndpointEnd = function() {
    if (this.log.logging) {
      this.log.log(USBDevice.prototype.EVENT.ERROR, 'Out endpoint stopped/cancelled');
    }
  };

  USBNode.prototype.init = function(preferredDeviceIndex, retrn) {

    var antInterface,
      err,
      antDevices;

    if (this.options.debugLevel)
      usb.setDebugLevel(this.options.debugLevel);

    this.device = this.devices[preferredDeviceIndex];

    if (this.device) {
      this._claimInterface(retrn);
    } else {
      this._generateError(this.ERROR.NO_DEVICE, retrn);
    }

  };

  USBNode.prototype._onInterfaceReleased = function(retrn, error) {

    if (error) {
      this.emit(USBDevice.prototype.EVENT.ERROR, error);
      retrn(error);
    } else {

      try {

        if (this._needsKernelDriverAttach) {
          if (this.log.logging) {
            this.log.log(USBDevice.prototype.EVENT.LOG, 'Reattaching kernel driver');
          }
          this.deviceInterface.attachKernelDriver();
          this._needsKernelDriverAttach = false;

        }

        this.device.close();
        this.emit(USBDevice.prototype.EVENT.CLOSED);

        this.removeAllListeners();
        this.inEndpoint.removeAllListeners();
        this.outEndpoint.removeAllListeners();
        console.log('usb', this);

        retrn();

      } catch (e) {
        retrn(e);
      }

    }
  };

  USBNode.prototype.exit = function(retrn) {

    if (this.device === undefined) {
      retrn(this.ERROR.NO_DEVICE);
    } else {

      if (this.inEndpoint) {

         usb.setDebugLevel(4);
         this.inEndpoint.currentTransfer.cancel();
        // Arguments to bind precedes actual arguments from passed by calling function
        // Some info on continuation passing style CPS http://matt.might.net/articles/by-example-continuation-passing-style/
        this.deviceInterface.release(true, this._onInterfaceReleased.bind(this, retrn));

      }

    }
  };

  USBNode.prototype._onInEndpointEnd = function() {
    if (this.log.logging) {
      this.log.log(USBDevice.prototype.EVENT.LOG, 'Polling cancelled');
    }
  };

  USBNode.prototype._onInEndpointError = function(error) {
    if (this.log.logging) {
      this.log.log(USBDevice.prototype.EVENT.ERROR, 'In endpoint error', error);
    }
  };

  USBNode.prototype._onInEndpointData = function(error,data) {
    /*
            if (error)
            {

              if (this.isTimeoutError(error)){ // Allow timeout, just reschedule listening
                if (this.log.logging){ this.log.log(USBDevice.prototype.EVENT.LOG, USBNode.prototype.ERROR.USB_TIMEOUT.message); }
                   this.listen(undefined,retrn);
              } else {

                  retrn(error);
                }
            }
             */

    if (data && data.length > 0) {

      if (this.log.logging) {
        this.log.log(USBDevice.prototype.EVENT.LOG, 'RX', data);
      }

      this.emit(USBDevice.prototype.EVENT.DATA, Util.prototype.toUint8Array(data));

    }

  };

  USBNode.prototype.setInEndpointTimeout = function(timeout) {

    var prevTimeout = this.inEndpoint.timeout;

    if (prevTimeout !== timeout) {

      this.inEndpoint.timeout = timeout;

      if (this.log.logging) {
        this.log.log(USBDevice.prototype.EVENT.LOG, 'In endpoint timeout changed from', prevTimeout, 'to', timeout);
      }
    } else {
      if (this.log.logging) {
        this.log.log(USBDevice.prototype.EVENT.LOG, 'In endpoint timeout no change, still', this.inEndpoint.timeout);
      }
    }
  };

  USBNode.prototype.setOutEndpointTimeout = function(timeout) {

    var prevTimeout = this.outEndpoint.timeout;

    if (prevTimeout !== timeout) {
      this.outEndpoint.timeout = timeout;
      if (this.log.logging) {
        this.log.log(USBDevice.prototype.EVENT.LOG, 'Out endpoint timeout changed from', prevTimeout, 'to', timeout);
      }
    } else {
      if (this.log.logging) {
        this.log.log(USBDevice.prototype.EVENT.LOG, 'Out endpoint timeout no change, still', this.outEndpoint.timeout);
      }
    }
  };

  USBNode.prototype.listen = function() {

    var endpointPacketSize = 8 * this.inEndpoint.descriptor.wMaxPacketSize,

       deserialize = function _deserialize()
                      {
                        this.inEndpoint.transfer(endpointPacketSize, function _transferInEndpoint(error,data) {
                          this._onInEndpointData.call(this,error,data);
                          if (!error)
                            deserialize();
                        }.bind(this));

                      }.bind(this);

    //this.setInEndpointTimeout(1000);

    if (this.log.logging) {
      this.log.log(USBDevice.prototype.EVENT.LOG, 'Listening in endpoint transfer packet size ' + endpointPacketSize + ' bytes' + ' device max packet size ' + this.inEndpoint.descriptor.wMaxPacketSize + ' bytes');
    }

    //http://www.beyondlogic.org/usbnutshell/usb4.shtml#Bulk
    //  this.inEndpoint.transfer(endpointPacketSize,this._onData.bind(this,retrn));

    //this.inEndpoint.on('data', this._onInEndpointData.bind(this));

    //this.inEndpoint.startPoll(1, endpointPacketSize);

     deserialize();

  };

  USBNode.prototype.transfer = function(chunk, retrn) {

    //this.setOutEndpointTimeout(1000);
    var nodeBuf = Util.prototype.toNodeBuffer(chunk);

    if (this.log.logging) {
      this.log.log(USBDevice.prototype.EVENT.LOG, 'TX', nodeBuf);
    }

    this.outEndpoint.transfer(nodeBuf, retrn);
  };

  function Util() {}

  Util.prototype.toNodeBuffer = function(chunk) {

    return new Buffer(chunk);

  };

  // http://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
  Util.prototype.toUint8Array = function(buffer) {
    var ab = new ArrayBuffer(buffer.length),
      view = new Uint8Array(ab);

    for (var i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
    }

    return view;
  };

  module.exports = USBNode;
  return module.exports;

});
