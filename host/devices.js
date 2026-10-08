'use strict';

var USBDevice = require('../usb/USBDevice');

module.exports = function(Host) {
  Host.prototype.onUSBError = function(error) {
    this.emit(this.EVENT.ERROR, error);
  };

  Host.prototype.setChannel = function(channel) {
    this.channel[channel.channel] = channel;
  };

  Host.prototype.getDevices = function() {
    return this.usb.getDevices();

  };

  Host.prototype.deviceToString = function (device,callback)
  {
    this.usb.deviceToString(device,callback);
  };

  Host.prototype.listDevices = function ()
  {
    var str = '';

    this.usb.getDevices().forEach (function (device,index) { str += index + ' ' + this.usb.deviceToString(device) + '\n'; }.bind(this));

    return str;
  };

  Host.prototype.init = function(iDevice, onInit) {

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

  };

  Host.prototype.exit = function(callback) {

    // Stop profile retry timers so nothing is sent on the USB device after it is closed
    for (var i = 0; i < Host.prototype.MAX_CHAN; i++) {
      if (this.channel[i] && typeof this.channel[i].shutdown === 'function') {
        this.channel[i].shutdown();
      }
    }

    this.resetSystem(function _onReset(resetError, notificationStartup) {

      for (var c = 0; c < Host.prototype.MAX_CHAN; c++) {
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

  };

};
