'use strict';
import USBDevice from '../usb/USBDevice.js';



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

    this.usb.on(USBDevice.EVENT.DATA, this.deserialize.bind(this));

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

    let usbExitError;

    for (var c = 0; c < this.constructor.MAX_CHAN; c++) {
      this.channel[c].removeAllListeners();
    }

    try {
      await this.usb.exit();
    } catch (error) {
      usbExitError = error;
    }

    this.removeAllListeners();

    if (usbExitError) {
      throw usbExitError;
    }
  }

}

export default function(Host) {
  for (const methodName of Object.getOwnPropertyNames(HostDevices.prototype)) {
    if (methodName !== 'constructor') {
      Host.prototype[methodName] = HostDevices.prototype[methodName];
    }
  }
};
