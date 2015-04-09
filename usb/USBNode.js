/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true, ArrayBuffer: true,
Buffer: true */

/*jshint -W097 */
'use strict';

var USBDevice = require('./USBDevice.js'),
  usb = require('usb');

function USBNode(options) {

  USBDevice.call(this, options);

  this.usb = usb;

  if (this.options.debugLevel)
    this.usb.setDebugLevel(this.options.debugLevel);

}

USBNode.prototype = Object.create(USBDevice.prototype);
USBNode.prototype.constructor = USBNode;

USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE = 64; // Based on info in nRF24AP2 data sheet

USBNode.prototype._onError = function(error) {
  if (this.log.logging) {
    this.log.log(USBDevice.prototype.EVENT.ERROR, error);
  }
};

USBNode.prototype._onAttach = function(device) {
  if (this._isANTDevice(device)) {

    device.open(); // Device must be open to execute getDescriptorString call on device object

    this.deviceToString(device, function(err, str) {
      device.close();
      if (this.log.logging) {
        this.log.log(USBDevice.prototype.EVENT.LOG, 'Attached device ' + str);
      }
    }.bind(this));

    this.getDevices();

    this.emit('attach', device);
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
      this.log.log(USBDevice.prototype.EVENT.LOG, 'Detached device ' + this.deviceToString(device));
    }

    this.getDevices();

    this.emit('detach', device);
  }
};

USBNode.prototype.deviceToString = function(device, retrn) {
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

  devices = this.usb.getDeviceList().filter(this._isANTDevice.bind(this));

  this.emit(this.EVENT.ENUMERATION_COMPLETE);

  return devices;
};

USBNode.prototype._getINEndpointPacketSize = function() {
  return this.inEndpoint.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
};

USBNode.prototype._getOUTEndpointPacketSize = function() {
  return this.outEndpoint.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
};

USBNode.prototype.setDeviceTimeout = function(timeout) {
  this.device.timeout = timeout;
};

USBNode.prototype.isTimeoutError = function(error) {

  return (error.errno === this.usb.LIBUSB_TRANSFER_TIMED_OUT);
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

      this.once('attachKernelDriver', function _detachKernelDriver() {

        if (this.log.logging) {
          this.log.log(USBDevice.prototype.EVENT.LOG, 'Reattaching kernel driver');
        }

        this.deviceInterface.attachKernelDriver();

      }.bind(this));

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

  this.inEndpoint.on('data', this._onInEndpointData.bind(this));

  this.outEndpoint = this.deviceInterface.endpoints[1];

  this.outEndpoint.on('error', this._onOutEndpointError.bind(this));
  this.outEndpoint.on('end', this._onOutEndpointEnd.bind(this));

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

  this.usb.on('attach', this._onAttach.bind(this)); // USB listen for attached listener 'newListener' and  enableHotplugEvents for any devices
  this.usb.on('detach', this._onDetach.bind(this)); // USB listen for detached listener 'removedListener' and disableHotplugEvents for any devices

  this.usb.on('error', this._onError.bind(this));

  this.device = this.getDevices()[preferredDeviceIndex];

  if (this.device) {

    if (this.log.logging)
      this.log.log('log','Init device '  + preferredDeviceIndex + ' ' + this.deviceToString(this.device));

    this.device.open();

    this._claimInterface(retrn);

  } else {
    this._generateError(this.ERROR.NO_DEVICE, retrn);
  }

};

USBNode.prototype._onInterfaceReleased = function(error) {

  this.emit('attachKernelDriver');

  this.device.close();

  this.emit(USBDevice.prototype.EVENT.CLOSED);

  this.usb.removeAllListeners();

  this.removeAllListeners();

};

USBNode.prototype.exit = function(retrn) {

  var onReleased = function _onReleased(err) {

    this._onInterfaceReleased.call(this); // Close device

    this.deviceInterface = null;
    this.inEndpoint = null;
    this.outEndpoint = null;
    this.device = null;

    retrn(err);
  }.bind(this);

  if (this.device === undefined) {
    retrn(this.ERROR.NO_DEVICE);
  } else {

    if (this.deviceInterface) {

      this.inEndpoint.stopPoll(function _onEnd() {

        if (this.log.logging)
          this.log.log(USBDevice.prototype.EVENT.LOG, 'Polling ended (no transfers pending)');

        this.inEndpoint.removeAllListeners();

        this.outEndpoint.removeAllListeners();

        // Some info on continuation passing style CPS http://matt.might.net/articles/by-example-continuation-passing-style/
        this.deviceInterface.release(true, onReleased);
      }.bind(this));

    } else {

      onReleased();
    }

  }
};

USBNode.prototype._onInEndpointError = function(error) {
  if (this.log.logging) {
    this.log.log(USBDevice.prototype.EVENT.ERROR, 'In endpoint error', error);
  }
};

USBNode.prototype._onInEndpointData = function(data) {

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

  if (this.log.logging)
    this.log.log('log','Start polling on in endpoint');

  this.inEndpoint.startPoll();

};

USBNode.prototype.transfer = function(chunk, retrn) {

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
