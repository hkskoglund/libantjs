

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

  'use strict';

  var USBDevice = require('./USBDevice.js'),
      usb = require('usb');

      function USBNode() {

          USBDevice.call(this);

          this.devices = this.getANTDevices();

          this.deviceInterface = undefined;

// Do we needs these?
          this.inEP = undefined;
          this.outEP = undefined;

          this._needsKernelDriverAttach = undefined; // For unix/linux

          this.setBurstMode(false);
      }

      USBNode.prototype = Object.create(USBDevice.prototype, { constructor : { value : USBNode,
                                                                              enumerable : false,
                                                                              writeable : true,
                                                                              configurable : true } });


      USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE = 64;  // Based on info in nRF24AP2 data sheet

      USBNode.prototype.getANTDevices = function ()
      {
        var knownANTdevices = this.getDevicesFromManifest(),
            devices;

        function filterANTdevices(usbDevice,index,arr)
        {
          var match = false,
              descriptor = usbDevice.deviceDescriptor;

            for (var devNr = 0; devNr < knownANTdevices.length; devNr++)
            {
              if (knownANTdevices[devNr].vendorId === descriptor.idVendor && knownANTdevices[devNr].productId === descriptor.idProduct)
                 {

                   match = true;
                   break;
                 }
            }

            return match;
        }

         devices = usb.getDeviceList().filter(filterANTdevices);

         this.emit(this.EVENT.ENUMERATION_COMPLETE);

         return devices;
      };

      USBNode.prototype._getINEndpointPacketSize = function () {
          return this.inEP.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
      };

      USBNode.prototype._getOUTEndpointPacketSize = function () {
          return this.outEP.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
      };

      USBNode.prototype.getDirectANTChipCommunicationTimeout = function () {
          return USBNode.prototype.ANT_DEVICE_TIMEOUT;
      };

      // ANT CHIP serial interface configured at 57600 baud (BR pins 1 2 3 = 111) = 57600 bit/s = 57.6 bit/ms
      // Sends : 1 start bit + 8 data bits + 1 stop bits = 10 bit/byte
      // 57.6 bit/ms / 10 bit/byte = 5.76 byte/ms
      // So, f.ex SYNC + MSG L. + MSG ID + 8 bytes payload + CRC = 12 bytes -> 12 bytes / 5.76 bytes/ms = 2.083 ms transfer time
      // 32 bytes transfer : 32 / 5.76 = 5.55 ms, 64 bytes : 2*5.55 = 11.11 ms
      // So a sensible timeout value could be >= 11.11 ms. It's possible to set a dynamic timeout based on how much bytes to transfer, but that needs some computations that takes time
      // dynamictimeout = parseInt(Math.Ceil(chunk/5.76),10)
      USBNode.prototype.setDirectANTChipCommunicationTimeout = function (timeout)
      {
          this.setDeviceTimeout(timeout || USBNode.prototype.ANT_DEVICE_TIMEOUT);
      };

      USBNode.prototype.setDeviceTimeout = function (timeout) {
          this.device.timeout = timeout;
      };

      USBNode.prototype.isTimeoutError = function (error) {

          return (error.errno === usb.LIBUSB_TRANSFER_TIMED_OUT);
      };

      USBNode.prototype._generateError = function (e,nextCB)
      {
        var err;

        if (!(e instanceof Error)) // USBNode specific error
        {
            err = new Error(e.message);
            err.code = e.code;
        }

        this.emit(USBDevice.prototype.EVENT.ERROR,err);

        nextCB(err);

      };

      USBNode.prototype.ERROR = {
        NO_DEVICE : {
          message : 'No device',
          code : 1
        },
        NO_INTERFACE : {
          message : 'No interface',
          code : 1
        }
    };


      USBNode.prototype._claimInterface = function (nextCB)
      {

        var kernelDriverActive;

         try {

           this.device.open();

           this.deviceInterface = this.device.interface();

           if (this.deviceInterface === undefined) {
             this._generateError(this.ERROR.NO_INTERFACE,nextCB);

           } else {

             // Unix can have kernel driver attached to USB; "usb_serial_simple" on linux

             kernelDriverActive = this.deviceInterface.isKernelDriverActive();

             console.log('isKernelDriverActive',kernelDriverActive);

             if (kernelDriverActive)
             {

               console.log('Detaching kernel driver');

               this.deviceInterface.detachKernelDriver();

               this._needsKernelDriverAttach = true;

             }

           // http://www.beyondlogic.org/usbnutshell/usb5.shtml

           this.inEP = this.deviceInterface.endpoints[0];

           this.outEP = this.deviceInterface.endpoints[1];

           this.deviceInterface.claim(); // Must call before attempting transfer on endpoints

           nextCB();
         }

         } catch (err)
         {
           console.log('error',err);
           this._generateError(err,nextCB);
         }



      };

      USBNode.prototype.init = function (preferredDeviceIndex,nextCB) {

          var antInterface,
              err,
              antDevices;

           usb.setDebugLevel(3);

          this.device = this.devices[preferredDeviceIndex];

          if (this.device)
          {
            this._claimInterface(nextCB);
          } else
          {
              this._generateError(this.ERROR.NO_DEVICE,nextCB);
          }

      };

      USBNode.prototype._onInterfaceReleased = function (nextCB,error)
       {
         
          if (error) {
              this.emit(USBDevice.prototype.EVENT.ERROR, error);
              nextCB(err);
            }
          else {

              try {

                if (this._needsKernelDriverAttach)
                {
                  console.log('Reattaching kernel driver');
                  this.deviceInterface.attachKernelDriver();
                  this._needsKernelDriverAttach = false;

                }

                this.device.close();
                this.emit(USBDevice.prototype.EVENT.CLOSED);

                nextCB();

              } catch (e) {
                  nextCB(e);
                }

          }
      };

      USBNode.prototype.exit = function (nextCB) {

          if (typeof this.device === "undefined") {
              nextCB(this.ERROR.NO_DEVICE);
          }

          else {

            if (this.inTransfer) {
                this.inTransfer.cancel();
            }

            if (this.outTransfer) {
                this.outTransfer.cancel();
            }

            console.log('About to release interface');

            this.deviceInterface.release(this._onInterfaceReleased.bind(this,nextCB));

          }
      };

      USBNode.prototype._onData = function (error,data,nextCB)
      {

        if (error)
        {

          if (this.isTimeoutError(error)) {
              this.log.log(USBDevice.prototype.EVENT.LOG, 'USB: No ANT responses in ' + LISTEN_TIMEOUT + " ms. Still listening...");
               this.listen(nextCB);
          } else {

              nextCB(error);
            }
        }

        if (data && data.length > 0) {
            this.log.log(USBDevice.prototype.EVENT.LOG,'RX', data);
            this.emit(USBDevice.prototype.EVENT.DATA,Util.prototype.toArrayBuffer(data));

        }

      };

      // "There is no flow control for data transmitted from ANT to host, therefore the Host controller must be able to receive data at any time" p. 8 of
      // Interfacing with ANT general purpose chipsets and modules rev 2.1 -> setup a read that never times out on in endpoint
      USBNode.prototype.listen = function (nextCB)
       {

          var INFINITY = 0;
            //  LISTEN_TIMEOUT = 30000;

          this.setDeviceTimeout(INFINITY);

          this.inTransfer = this.inEP.transfer(this._getINEndpointPacketSize(), this._onData.bind(this,error,data,nextCB));

      };

      USBNode.prototype.transfer = function (chunk, nextCB)
      {
         var chunkToNodeBuffer =

          this.setDirectANTChipCommunicationTimeout();
          this.log.log(USBDevice.prototype.EVENT.LOG,'TX', Util.prototype.toNodeBuffer(chunk));
          this.outTransfer = this.outEP.transfer(chunkToNodeBuffer, nextCB);

      };

      function Util ()
      {

      }

      Util.prototype.toNodeBuffer = function (chunk)
      {

        return new Buffer(new Uint8Array(chunk));

      };

      // http://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
      Util.prototype.toArrayBuffer = function (buffer)
      {
          var ab = new ArrayBuffer(buffer.length),
              view = new Uint8Array(ab);

          for (var i = 0; i < buffer.length; ++i) {
              view[i] = buffer[i];
          }

          return ab;
       };

      module.exports = USBNode;
      return module.exports;

});
