'use strict';

var USBDevice = require('../usb/USBDevice');

class HostDevices {
  onUSBError(error) {
    this.emit(this.EVENT.ERROR, error);
  }

  setChannel(channel) {
    this.channel[channel.channel] = channel;
  }

  getDevices(callback) {
    return this.usb.getDevices(callback);
  }

  deviceToString(device, callback) {
    this.usb.deviceToString(device,callback);
  }

  listDevices() {
    var str = '';

    this.usb.getDevices().forEach (function (device,index) { str += index + ' ' + this.usb.deviceToString(device) + '\n'; }.bind(this));

    return str;
  }

  init(iDevice, onInit) {

    var onUSBinit = function(onInit, error) {

      if (error) {
        onInit(error);
      } else {

        this.usb.on(USBDevice.prototype.EVENT.DATA, this.deserialize.bind(this));

        this.usb.listen();

        this.resetSystem(onInit);

      }
    }.bind(this);

    /*
              this.libConfig(libConfig.getFlagsByte(),
                  function _libConfig(error, channelResponse)
  {
                      if (!error)
  {

                          if (this.log.logging)
                              this.log.debug( libConfig.toString());
                          _doLibConfigCB();
                      }
                      else
                          _doLibConfigCB(error);
                  }.bind(this)); */

    this.usb.init(iDevice, onUSBinit.bind(this, onInit));

  }

  exit(callback) {

    // Stop profile retry timers so nothing is sent on the USB device after it is closed
    for (var i = 0; i < this.MAX_CHAN; i++) {
      if (this.channel[i] && typeof this.channel[i].shutdown === 'function') {
        this.channel[i].shutdown();
      }
    }

    this.resetSystem(function _onReset(resetError, notificationStartup) {

      for (var c = 0; c < this.MAX_CHAN; c++) {
        this.channel[c].removeAllListeners();
      }

      this.usb.exit(function _onUSBexit(usbExitError) {

        this.removeAllListeners();

        if (resetError && usbExitError) {
          var shutdownError = new Error('Shutdown failed during reset and USB exit');
          shutdownError.resetError = resetError;
          shutdownError.usbExitError = usbExitError;
          callback(shutdownError);
        } else {
          callback(resetError || usbExitError);
        }

      }.bind(this));

    }.bind(this));

  }

}

module.exports = function(Host) {
  for (const methodName of Object.getOwnPropertyNames(HostDevices.prototype)) {
    if (methodName !== 'constructor') {
      Host.prototype[methodName] = HostDevices.prototype[methodName];
    }
  }
};
