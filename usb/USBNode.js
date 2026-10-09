'use strict';

const USBDevice = require('./USBDevice.js');
const usb = require('usb').usb;

class USBNode extends USBDevice {
  constructor(options = {}) {
    super(options);

    this.usb = usb;
    this._usbAttachListener = this._onAttach.bind(this);
    this._usbDetachListener = this._onDetach.bind(this);
    this._usbErrorListener = this._onError.bind(this);
    this._inEndpointErrorListener = this._onInEndpointError.bind(this);
    this._inEndpointDataListener = this._onInEndpointData.bind(this);
    this._outEndpointErrorListener = this._onOutEndpointError.bind(this);
    this._outEndpointEndListener = this._onOutEndpointEnd.bind(this);

    if (this.options.debugLevel) {
      this.usb.setDebugLevel(this.options.debugLevel);
    }
  }

  _onError(error) {
    if (this.log.logging) {
      this.log.error(error);
    }
    this.emit(this.EVENT.ERROR, error);
  }

  _removeUSBListeners() {
    this.usb.removeListener('attach', this._usbAttachListener);
    this.usb.removeListener('detach', this._usbDetachListener);
    this.usb.removeListener('error', this._usbErrorListener);
  }

  _onAttach(device) {
    if (!this._isANTDevice(device)) {
      return;
    }

    // The device must be open to read its manufacturer and product strings.
    device.open();
    this.deviceToString(device, (error, description) => {
      device.close();
      if (this.log.logging) {
        this.log.debug('Attached device ' + description);
      }
    });

    this.getDevices();
    this.emit('attach', device);
  }

  _getManufacturerAndProduct(device, callback) {
    const filterDescriptor = (value) => {
      const terminator = value.indexOf('\u0000');
      return terminator === -1 ? value : value.substring(0, terminator);
    };
    let manufacturer;

    device.getStringDescriptor(device.deviceDescriptor.iManufacturer, (manufacturerError, value) => {
      if (!manufacturerError) {
        manufacturer = filterDescriptor(value);
      }

      device.getStringDescriptor(device.deviceDescriptor.iProduct, (productError, productValue) => {
        const product = productError ? undefined : filterDescriptor(productValue);
        callback(productError, { manufacturer, product });
      });
    });
  }

  _onDetach(device) {
    if (!this._isANTDevice(device)) {
      return;
    }

    if (this.log.logging) {
      this.log.debug('Detached device ' + this.deviceToString(device));
    }

    this.getDevices();
    this.emit('detach', device);
  }

  deviceToString(device, callback) {
    let description = 'Bus ' + device.busNumber +
      ' Number ' + device.deviceAddress +
      ': ID ' + device.deviceDescriptor.idVendor.toString(16) +
      ':' + device.deviceDescriptor.idProduct.toString(16);

    if (!callback) {
      return description;
    }

    this._getManufacturerAndProduct(device, (error, details) => {
      if (!error) {
        if (details.manufacturer !== undefined) {
          description += ' ' + details.manufacturer + ',';
        }
        if (details.product !== undefined) {
          description += ' ' + details.product;
        }
      }
      callback(error, description);
    });
  }

  _isANTDevice(device) {
    const descriptor = device.deviceDescriptor;
    return this.getDevicesFromManifest().some((knownDevice) =>
      knownDevice.vendorId === descriptor.idVendor &&
      knownDevice.productId === descriptor.idProduct
    );
  }

  getDevices() {
    const devices = this.usb.getDeviceList().filter((device) => this._isANTDevice(device));
    this.emit(this.EVENT.ENUMERATION_COMPLETE);
    return devices;
  }

  _getINEndpointPacketSize() {
    return this.inEndpoint.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
  }

  _getOUTEndpointPacketSize() {
    return this.outEndpoint.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
  }

  setDeviceTimeout(timeout) {
    this.device.timeout = timeout;
  }

  isTimeoutError(error) {
    return Boolean(error) && error.errno === this.usb.LIBUSB_TRANSFER_TIMED_OUT;
  }

  _generateError(error, callback) {
    const generatedError = error instanceof Error
      ? error
      : Object.assign(new Error(error.message), { code: error.code });

    this.emit(this.EVENT.ERROR, generatedError);
    callback(generatedError);
  }

  _claimInterface(callback) {
    this.deviceInterface = this.device.interface();

    // Some Linux systems attach usb_serial_simple to ANT sticks.
    let isKernelDriverActive;
    try {
      isKernelDriverActive = this.deviceInterface.isKernelDriverActive();
    } catch (error) {
      if (this.log.logging) {
        this.log.error('isKernelDriverActive API call failed ' + process.platform + '-' + process.arch, error);
      }
    }

    if (isKernelDriverActive) {
      if (this.log.logging) {
        this.log.debug('Detaching kernel driver');
      }

      this.deviceInterface.detachKernelDriver();
      this.once('attachKernelDriver', () => {
        if (this.log.logging) {
          this.log.debug('Reattaching kernel driver');
        }
        this.deviceInterface.attachKernelDriver();
      });
    }

    this.inEndpoint = this.deviceInterface.endpoints[0];
    this.inEndpoint.on('error', this._inEndpointErrorListener);
    this.inEndpoint.on('data', this._inEndpointDataListener);

    this.outEndpoint = this.deviceInterface.endpoints[1];
    this.outEndpoint.on('error', this._outEndpointErrorListener);
    this.outEndpoint.on('end', this._outEndpointEndListener);

    this.deviceInterface.claim();
    callback();
  }

  _onOutEndpointError(error) {
    if (this.log.logging) {
      this.log.error('Out endpoint', error);
    }
    this.emit(this.EVENT.ERROR, error);
  }

  _onOutEndpointEnd() {
    if (this.log.logging) {
      this.log.error('Out endpoint stopped/cancelled');
    }
  }

  init(preferredDeviceIndex, callback) {
    this.usb.on('attach', this._usbAttachListener);
    this.usb.on('detach', this._usbDetachListener);
    this.usb.on('error', this._usbErrorListener);

    this.device = this.getDevices()[preferredDeviceIndex];
    if (!this.device) {
      this._removeUSBListeners();
      this._generateError(this.ERROR.NO_DEVICE, callback);
      return;
    }

    if (this.log.logging) {
      this.log.debug('Init device ' + preferredDeviceIndex + ' ' + this.deviceToString(this.device));
    }

    this.device.open();
    // Reset to discard queued broadcast data left by a previous connection.
    this.device.reset((resetError) => {
      if (!resetError) {
        this._claimInterface(callback);
        return;
      }

      if (this.log.logging) {
        this.log.error('Failed to reset device', resetError);
      }

      this._removeUSBListeners();
      let error = resetError;
      try {
        this.device.close();
      } catch (closeError) {
        error = new Error('Failed to reset and close USB device');
        error.resetError = resetError;
        error.closeError = closeError;
      }
      this.device = undefined;
      callback(error);
    });
  }

  _onInterfaceReleased() {
    this.emit('attachKernelDriver');
    this.device.close();
    this.emit(this.EVENT.CLOSED);

    this._removeUSBListeners();
    if (this.inEndpoint) {
      this.inEndpoint.removeListener('error', this._inEndpointErrorListener);
      this.inEndpoint.removeListener('data', this._inEndpointDataListener);
    }
    if (this.outEndpoint) {
      this.outEndpoint.removeListener('error', this._outEndpointErrorListener);
      this.outEndpoint.removeListener('end', this._outEndpointEndListener);
    }
  }

  exit(callback) {
    const onReleased = (error) => {
      this._onInterfaceReleased();
      this.deviceInterface = null;
      this.inEndpoint = null;
      this.outEndpoint = null;
      this.device = null;
      callback(error);
    };

    if (!this.device) {
      this._generateError(this.ERROR.NO_DEVICE, callback);
      return;
    }

    if (!this.deviceInterface) {
      onReleased();
      return;
    }

    const releaseInterface = () => {
      if (this.log.logging) {
        this.log.debug('Polling ended (no transfers pending)');
      }
      this.deviceInterface.release(true, onReleased);
    };

    if (this.inEndpoint.pollActive) {
      this.inEndpoint.stopPoll(releaseInterface);
    } else if (this.inEndpoint.pollTransfers) {
      this.inEndpoint.once('end', releaseInterface);
    } else {
      releaseInterface();
    }
  }

  _onInEndpointError(error) {
    if (this.log.logging) {
      this.log.error('In endpoint error', error);
    }
    this.emit(this.EVENT.ERROR, error);
  }

  _onInEndpointData(data) {
    if (data && data.length > 0) {
      if (this.log.logging) {
        this.log.debug('RX', data);
      }
      this.emit(this.EVENT.DATA, Uint8Array.from(data));
    }
  }

  setInEndpointTimeout(timeout) {
    const previousTimeout = this.inEndpoint.timeout;
    this.inEndpoint.timeout = timeout;

    if (this.log.logging) {
      this.log.debug(
        previousTimeout === timeout ? 'In endpoint timeout no change, still' : 'In endpoint timeout changed from',
        previousTimeout,
        ...(previousTimeout === timeout ? [] : ['to']),
        timeout
      );
    }
  }

  setOutEndpointTimeout(timeout) {
    const previousTimeout = this.outEndpoint.timeout;
    this.outEndpoint.timeout = timeout;

    if (this.log.logging) {
      this.log.debug(
        previousTimeout === timeout ? 'Out endpoint timeout no change, still' : 'Out endpoint timeout changed from',
        previousTimeout,
        ...(previousTimeout === timeout ? [] : ['to']),
        timeout
      );
    }
  }

  listen() {
    if (this.log.logging) {
      this.log.debug('Start polling on in endpoint');
    }
    this.inEndpoint.startPoll();
  }

  transfer(chunk, callback) {
    const buffer = Buffer.from(chunk);
    if (this.log.logging) {
      this.log.debug('TX', buffer);
    }

    if (!this.outEndpoint) {
      if (typeof callback === 'function') {
        callback(new Error('USB device closed'));
      }
      return;
    }

    this.outEndpoint.transfer(buffer, callback);
  }
}

USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE = 64;
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
  }
};

module.exports = USBNode;
