'use strict';

var USBDevice = require('../usb/USBDevice');

class HostDevices {
  onUSBError(error) {
    this.emit(this.constructor.EVENT.ERROR, error);
  }

  setChannel(channel) {
    this.channel[channel.channel] = channel;
  }

  getDevices() {
    return this.usb.getDevices();
  }

  refreshDevices() {
    return this.usb.refreshDevices();
  }

  deviceToString(device) {
    return this.usb.deviceToString(device);
  }

  listDevices() {
    var str = '';

    this.usb.getDevices().forEach (function (device,index) { str += index + ' ' + this.usb.deviceToString(device) + '\n'; }.bind(this));

    return str;
  }

  async init(iDevice) {

    await this.usb.init(iDevice);

    this.usb.on(USBDevice.prototype.EVENT.DATA, this.deserialize.bind(this));

    this.usb.listen();

    return this.resetSystem();
  }

  async exit() {

    // Stop profile retry timers so nothing is sent on the USB device after it is closed
    for (var i = 0; i < this.constructor.MAX_CHAN; i++) {
      if (this.channel[i] && typeof this.channel[i].shutdown === 'function') {
        this.channel[i].shutdown();
      }
    }

    let resetError;
    let usbExitError;

    try {
      await this.resetSystem();
    } catch (error) {
      resetError = error;
    }

    for (var c = 0; c < this.constructor.MAX_CHAN; c++) {
      this.channel[c].removeAllListeners();
    }

    try {
      await this.usb.exit();
    } catch (error) {
      usbExitError = error;
    }

    this.removeAllListeners();

    if (resetError && usbExitError) {
      var shutdownError = new Error('Shutdown failed during reset and USB exit');
      shutdownError.resetError = resetError;
      shutdownError.usbExitError = usbExitError;
      throw shutdownError;
    }

    if (resetError || usbExitError) {
      throw resetError || usbExitError;
    }
  }

}

module.exports = function(Host) {
  for (const methodName of Object.getOwnPropertyNames(HostDevices.prototype)) {
    if (methodName !== 'constructor') {
      Host.prototype[methodName] = HostDevices.prototype[methodName];
    }
  }
};
