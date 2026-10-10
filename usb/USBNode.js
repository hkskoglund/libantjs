'use strict';

const USBDevice = require('./USBDevice.js');
const usb = require('usb').usb;

const INTERFACE_NUMBER = 0;
const DEFAULT_ENDPOINT_NUMBER = 1;
// A timed-out (cancelled) in transfer keeps swallowing incoming packets, so polling must effectively never time out.
const DEFAULT_POLL_TIMEOUT = 2147483647;
const EXIT_POLL_WAIT = 2000;
// ANT Reset System message; its startup response completes a pending in transfer.
const RESET_SYSTEM_MESSAGE = [0xa4, 0x01, 0x4a, 0x00, 0xef];
const DEFAULT_OUT_TIMEOUT = 1000;

class USBNode extends USBDevice {
  constructor(options = {}) {
    super(options);

    this.usb = usb;
    this.devices = [];
    this.polling = false;
    this.pollPromise = Promise.resolve();
    this.outQueue = Promise.resolve();
    this.kernelDriverDetached = false;
    this._usbConnectListener = this._onAttach.bind(this);
    this._usbDisconnectListener = this._onDetach.bind(this);
  }

  _onError(error) {
    if (this.log.logging) {
      this.log.error(error);
    }
    this.emit(this.constructor.EVENT.ERROR, error);
  }

  _addUSBListeners() {
    this.usb.addEventListener('connect', this._usbConnectListener);
    this.usb.addEventListener('disconnect', this._usbDisconnectListener);
  }

  _removeUSBListeners() {
    this.usb.removeEventListener('connect', this._usbConnectListener);
    this.usb.removeEventListener('disconnect', this._usbDisconnectListener);
  }

  _onAttach(event) {
    const device = event && event.device;
    if (!device || !this._isANTDevice(device)) {
      return;
    }

    if (this.log.logging) {
      this.log.debug('Attached device ' + this.deviceToString(device));
    }

    this._refreshAndEmit('attach', device);
  }

  _onDetach(event) {
    const device = event && event.device;
    if (!device || !this._isANTDevice(device)) {
      return;
    }

    if (this.log.logging) {
      this.log.debug('Detached device ' + this.deviceToString(device));
    }

    this._refreshAndEmit('detach', device);
  }

  async _refreshAndEmit(eventName, device) {
    try {
      await this.refreshDevices();
    } catch {
      // The event is still emitted; the previous device list is kept
    }
    this.emit(eventName, device);
  }

  deviceToString(device) {
    let description = 'Bus ' + device.bus +
      ' Number ' + device.address +
      ': ID ' + device.vendorId.toString(16) +
      ':' + device.productId.toString(16);

    if (device.manufacturerName) {
      description += ' ' + device.manufacturerName + ',';
    }
    if (device.productName) {
      description += ' ' + device.productName;
    }

    return description;
  }

  _isANTDevice(device) {
    return this.getDevicesFromManifest().some((knownDevice) =>
      knownDevice.vendorId === device.vendorId &&
      knownDevice.productId === device.productId
    );
  }

  // usb@3 enumerates asynchronously
  async refreshDevices() {
    const devices = await this.usb.getDevices();
    this.devices = devices.filter((device) => this._isANTDevice(device));
    this.emit(this.constructor.EVENT.ENUMERATION_COMPLETE);
    return this.devices;
  }

  // The list from the last enumeration; use refreshDevices() for a fresh list.
  getDevices() {
    return this.devices;
  }

  _getINEndpointPacketSize() {
    return this.inEndpoint.packetSize || USBNode.DEFAULT_ENDPOINT_PACKET_SIZE;
  }

  _getOUTEndpointPacketSize() {
    return this.outEndpoint.packetSize || USBNode.DEFAULT_ENDPOINT_PACKET_SIZE;
  }

  setDeviceTimeout(timeout) {
    this.deviceTimeout = timeout;
  }

  isTimeoutError(error) {
    return Boolean(error) && error.message === 'Cancelled';
  }

  _generateError(error) {
    const generatedError = error instanceof Error
      ? error
      : Object.assign(new Error(error.message), { code: error.code });

    this.emit(this.constructor.EVENT.ERROR, generatedError);
    return generatedError;
  }

  // Some ANT sticks report a broken configuration string descriptor, so fall back to the standard endpoint layout.
  _findEndpoints() {
    const endpoints = {
      inEndpoint: { endpointNumber: DEFAULT_ENDPOINT_NUMBER, packetSize: USBNode.DEFAULT_ENDPOINT_PACKET_SIZE, timeout: DEFAULT_POLL_TIMEOUT },
      outEndpoint: { endpointNumber: DEFAULT_ENDPOINT_NUMBER, packetSize: USBNode.DEFAULT_ENDPOINT_PACKET_SIZE, timeout: DEFAULT_OUT_TIMEOUT }
    };

    try {
      const descriptors = this.device.configuration.interfaces
        .find((deviceInterface) => deviceInterface.interfaceNumber === INTERFACE_NUMBER)
        .alternate.endpoints;
      for (const descriptor of descriptors) {
        const target = endpoints[descriptor.direction === 'in' ? 'inEndpoint' : 'outEndpoint'];
        target.endpointNumber = descriptor.endpointNumber;
        target.packetSize = descriptor.packetSize || target.packetSize;
      }
    } catch (error) {
      if (this.log.logging) {
        this.log.debug('Using default endpoints', error.message);
      }
    }

    return endpoints;
  }

  async _claimInterface() {
    // Some Linux systems attach usb_serial_simple to ANT sticks.
    try {
      await this.device.detachKernelDriver(INTERFACE_NUMBER);
      this.kernelDriverDetached = true;
      if (this.log.logging) {
        this.log.debug('Detached kernel driver');
      }
    } catch {
      // Fails when no kernel driver is attached (or on non-Linux platforms)
    }

    await this.device.claimInterface(INTERFACE_NUMBER);
    this.deviceInterface = { interfaceNumber: INTERFACE_NUMBER };

    const { inEndpoint, outEndpoint } = this._findEndpoints();
    this.inEndpoint = inEndpoint;
    this.outEndpoint = outEndpoint;
  }

  async init(preferredDeviceIndex) {
    this._addUSBListeners();

    let devices;
    let enumerationError;
    try {
      devices = await this.refreshDevices();
    } catch (error) {
      enumerationError = error;
      devices = this.devices;
    }

    this.device = devices[preferredDeviceIndex];
    if (!this.device) {
      this._removeUSBListeners();
      throw this._generateError(enumerationError || this.constructor.ERROR.NO_DEVICE);
    }

    if (this.log.logging) {
      this.log.debug('Init device ' + preferredDeviceIndex + ' ' + this.deviceToString(this.device));
    }

    try {
      await this.device.open();
      // Reset to discard queued broadcast data left by a previous connection.
      await this.device.reset();
    } catch (resetError) {
      if (this.log.logging) {
        this.log.error('Failed to reset device', resetError);
      }

      this._removeUSBListeners();
      let error = resetError;
      try {
        await this.device.close();
      } catch (closeError) {
        error = new Error('Failed to reset and close USB device');
        error.resetError = resetError;
        error.closeError = closeError;
      }
      this.device = undefined;
      throw error;
    }

    try {
      await this._claimInterface();
    } catch (claimError) {
      this._removeUSBListeners();
      try {
        await this.device.close();
      } catch (closeError) {
        claimError.closeError = closeError;
      }
      this.device = undefined;
      throw claimError;
    }
  }

  async _releaseDevice() {
    const device = this.device;
    let firstError;
    const attempt = async (operation) => {
      try {
        await operation();
      } catch (error) {
        firstError = firstError || error;
      }
    };

    if (this.deviceInterface) {
      await attempt(() => device.releaseInterface(INTERFACE_NUMBER));
    }
    if (this.kernelDriverDetached) {
      this.kernelDriverDetached = false;
      if (this.log.logging) {
        this.log.debug('Reattaching kernel driver');
      }
      await attempt(() => device.attachKernelDriver(INTERFACE_NUMBER));
    }
    await attempt(() => device.close());
    return firstError;
  }

  async exit() {
    if (!this.device) {
      throw this._generateError(this.constructor.ERROR.NO_DEVICE);
    }

    // A claimed interface cannot be released while a transfer is pending.
    const wasPolling = this.polling;
    this.polling = false;
    if (wasPolling) {
      this.transfer(RESET_SYSTEM_MESSAGE).catch(() => {});
    }

    let pollWaitTimer;
    const pollEnded = Promise.race([
      this.pollPromise,
      new Promise((resolve) => { pollWaitTimer = setTimeout(resolve, EXIT_POLL_WAIT); })
    ]);

    await Promise.all([pollEnded, this.outQueue]);
    clearTimeout(pollWaitTimer);
    if (this.log.logging) {
      this.log.debug('Polling ended (no transfers pending)');
    }
    const error = await this._releaseDevice();
    this.emit(this.constructor.EVENT.CLOSED);
    this._removeUSBListeners();
    this.deviceInterface = null;
    this.inEndpoint = null;
    this.outEndpoint = null;
    this.device = null;
    if (error) {
      throw error;
    }
  }

  _onInEndpointError(error) {
    if (this.log.logging) {
      this.log.error('In endpoint error', error);
    }
    this.emit(this.constructor.EVENT.ERROR, error);
  }

  _onInEndpointData(data) {
    if (data && data.length > 0) {
      if (this.log.logging) {
        this.log.debug('RX', data);
      }
      this.emit(this.constructor.EVENT.DATA, Uint8Array.from(data));
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

  async _poll() {
    const device = this.device;
    const endpoint = this.inEndpoint;

    while (this.polling) {
      let data;
      try {
        const result = await device.transferIn(endpoint.endpointNumber, endpoint.packetSize, endpoint.timeout);
        if (result.status === 'ok' && result.data) {
          data = new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
        }
      } catch (error) {
        // Only reached when the transfer timeout expires; keep listening.
        if (this.isTimeoutError(error)) {
          continue;
        }
        if (this.polling) {
          this.polling = false;
          this._onInEndpointError(error);
        }
        continue;
      }

      if (data) {
        this._onInEndpointData(data);
      }
    }
  }

  listen() {
    if (this.polling) {
      return;
    }

    if (this.log.logging) {
      this.log.debug('Start polling on in endpoint');
    }
    this.polling = true;
    this.pollPromise = this._poll();
  }

  transfer(chunk) {
    const buffer = Uint8Array.from(chunk);
    if (this.log.logging) {
      this.log.debug('TX', buffer);
    }

    if (!this.outEndpoint) {
      return Promise.reject(new Error('USB device closed'));
    }

    const device = this.device;
    const endpoint = this.outEndpoint;

    // The native binding rejects overlapping transfers on the same endpoint.
    const transferred = this.outQueue.then(async () => {
      const result = await device.transferOut(endpoint.endpointNumber, buffer, endpoint.timeout);
      if (result.status !== 'ok') {
        throw new Error('USB transfer out failed with status ' + result.status);
      }
    });
    this.outQueue = transferred.catch(() => {});
    return transferred;
  }

  static DEFAULT_ENDPOINT_PACKET_SIZE = 64;
  static ERROR = {
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
}




module.exports = USBNode;
