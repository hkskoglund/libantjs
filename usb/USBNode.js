'use strict';

var USBDevice = require('./USBDevice.js'),
  usb = require('usb');

function USBNode(options) {

  USBDevice.call(this, options);

  this.usb = usb;
  this._usbAttachListener = this._onAttach.bind(this);
  this._usbDetachListener = this._onDetach.bind(this);
  this._usbErrorListener = this._onError.bind(this);

  if (this.options.debugLevel)
    this.usb.setDebugLevel(this.options.debugLevel || 0);

}

USBNode.prototype = Object.create(USBDevice.prototype);
USBNode.prototype.constructor = USBNode;

USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE = 64; // Based on info in nRF24AP2 data sheet

USBNode.prototype._onError = function(error) {
  if (this.log.logging) {
    this.log.log(USBDevice.prototype.EVENT.ERROR, error);
  }
};

USBNode.prototype._removeUSBListeners = function() {
  this.usb.removeListener('attach', this._usbAttachListener);
  this.usb.removeListener('detach', this._usbDetachListener);
  this.usb.removeListener('error', this._usbErrorListener);
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
    product,
    filter = function _strfiltler(str) {
      var i = str.indexOf('\u0000');
      // Descriptor is a null terminated string
      if (i !== -1)
        return str.substring(0, i); // ignore characters after null
      else
        return str;
    };

  device.getStringDescriptor(device.deviceDescriptor.iManufacturer, function _manufacturer(error, data) {

    if (!error) {

      manufacturer = filter(data);
    }

    // THEN

    device.getStringDescriptor(device.deviceDescriptor.iProduct, function _product(error, data) {

      if (!error) {

        product = filter(data);
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

};

USBNode.prototype._claimInterface = function(retrn) {

  var isKernelDriverActive;

  this.deviceInterface = this.device.interface();

  // Linux can have kernel driver attached to ANT USB; "usb_serial_simple"
  // Can be verified with lsmod | grep usb

  // Issue : Windows driver may not support API call isKernelDriverActive

  try {
    isKernelDriverActive = this.deviceInterface.isKernelDriverActive();

  } catch (e) {
    if (this.log.logging)
      this.log.log('error', 'isKernelDriverActive API call failed ' + process.platform + '-' + process.arch, e);

  }

  if (isKernelDriverActive) {

    if (this.log.logging) {
      this.log.log(USBDevice.prototype.EVENT.LOG, 'Detaching kernel driver');
    }

    this.deviceInterface.detachKernelDriver();

    this.once('attachKernelDriver', function _attachKernelDriver() {

      if (this.log.logging) {
        this.log.log(USBDevice.prototype.EVENT.LOG, 'Reattaching kernel driver');
      }

      this.deviceInterface.attachKernelDriver();

    }.bind(this));

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

  this.usb.on('attach', this._usbAttachListener); // USB listen for attached listener 'newListener' and  enableHotplugEvents for any devices
  this.usb.on('detach', this._usbDetachListener); // USB listen for detached listener 'removedListener' and disableHotplugEvents for any devices
  this.usb.on('error', this._usbErrorListener);

  this.device = this.getDevices()[preferredDeviceIndex];

  if (this.device) {

    if (this.log.logging)
      this.log.log('log', 'Init device ' + preferredDeviceIndex + ' ' + this.deviceToString(this.device));

    this.device.open();

    // Discard data in buffers, i.e user exit without closing channels (will fill buffers with broadcasts)
    this.device.reset(function _reset(e)
    {
      if (e)
        {
          var resetError = e;

          if (this.log.logging)
            this.log.log('error','Failed to reset device',e);

          this._removeUSBListeners();
          try {
            this.device.close();
          } catch (closeError) {
            resetError = new Error('Failed to reset and close USB device');
            resetError.resetError = e;
            resetError.closeError = closeError;
          }
          this.device = undefined;
          retrn(resetError);
          return;
        }

      this._claimInterface(retrn);

    }.bind(this));

  } else {
    this._removeUSBListeners();
    this._generateError(this.ERROR.NO_DEVICE, retrn);
  }

};

USBNode.prototype._onInterfaceReleased = function(error) {

  this.emit('attachKernelDriver');

  this.device.close();

  this.emit(USBDevice.prototype.EVENT.CLOSED);

  this._removeUSBListeners();

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
    return this._generateError(this.ERROR.NO_DEVICE, retrn);
  } else {

    if (this.deviceInterface) {

      var releaseInterface = function _releaseInterface() {

        if (this.log.logging)
          this.log.log(USBDevice.prototype.EVENT.LOG, 'Polling ended (no transfers pending)');

        this.inEndpoint.removeAllListeners();

        this.outEndpoint.removeAllListeners();

        // Some info on continuation passing style CPS http://matt.might.net/articles/by-example-continuation-passing-style/
        this.deviceInterface.release(true, onReleased);
      }.bind(this);

      if (this.inEndpoint.pollActive) {
        this.inEndpoint.stopPoll(releaseInterface);
      } else if (this.inEndpoint.pollTransfers) {
        this.inEndpoint.once('end', releaseInterface);
      } else {
        releaseInterface();
      }

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

    this.emit(USBDevice.prototype.EVENT.DATA, Util.toUint8Array(data));
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
    this.log.log('log', 'Start polling on in endpoint');

  this.inEndpoint.startPoll();

};

USBNode.prototype.transfer = function(chunk, retrn) {

  var nodeBuf = Util.toNodeBuffer(chunk);

  if (this.log.logging) {
    this.log.log(USBDevice.prototype.EVENT.LOG, 'TX', nodeBuf);
  }

  if (!this.outEndpoint) {
    if (typeof retrn === 'function') {
      retrn(new Error('USB device closed'));
    }
    return;
  }

  this.outEndpoint.transfer(nodeBuf, retrn);
};

function Util() {}

Util.toNodeBuffer = function(chunk) {

  return Buffer.from(chunk);

};

// http://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
Util.toUint8Array = function(buffer) {
  var ab = new ArrayBuffer(buffer.length),
    view = new Uint8Array(ab);

  for (var i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }

  return view;
};

module.exports = USBNode;
