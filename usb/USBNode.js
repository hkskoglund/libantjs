

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

  'use strict';

  var USBDevice = require('./USBDevice.js'),
      usb = require('usb');

      function USBNode(options) {

          USBDevice.call(this,options);

          this.devices = this.getDevices();

          this.deviceInterface = undefined;

// Do we needs these?
          this.inEndpoint = undefined;
          this.outEndpoint = undefined;

          this._needsKernelDriverAttach = undefined; // For unix/linux

          this.setBurstMode(false);
      }

      USBNode.prototype = Object.create(USBDevice.prototype, { constructor : { value : USBNode,
                                                                              enumerable : false,
                                                                              writeable : true,
                                                                              configurable : true } });


      USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE = 64;  // Based on info in nRF24AP2 data sheet

      USBNode.prototype.getDevices = function ()
      {
        var knownANTdevices = this.getDevicesFromManifest(),
            devices;

        function filterdevices(usbDevice,index,arr)
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

         devices = usb.getDeviceList().filter(filterdevices);

         this.emit(this.EVENT.ENUMERATION_COMPLETE);

         return devices;
      };

      USBNode.prototype._getINEndpointPacketSize = function () {
          return this.inEndpoint.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
      };

      USBNode.prototype._getOUTEndpointPacketSize = function () {
          return this.outEndpoint.descriptor.wMaxPacketSize || USBNode.prototype.DEFAULT_ENDPOINT_PACKET_SIZE;
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

      USBNode.prototype._generateError = function (e,retrn)
      {
        var err;

        if (!(e instanceof Error)) // USBNode specific error
        {
            err = new Error(e.message);
            err.code = e.code;
        }

        this.emit(USBDevice.prototype.EVENT.ERROR,err);

        retrn(err);

      };

      USBNode.prototype.ERROR = {
        NO_DEVICE : {
          message : 'No device',
          code : 1
        },
        NO_INTERFACE : {
          message : 'No interface',
          code : 2
        },

        USB_TIMEOUT : {
          message : 'Timeout',
          code : 3
        }

    };


      USBNode.prototype._claimInterface = function (retrn)
      {

        try {

           this.device.open();

           this.deviceInterface = this.device.interface();

           if (this.deviceInterface === undefined) {
             this._generateError(this.ERROR.NO_INTERFACE,retrn);

           } else {

             // Linux can have kernel driver attached to ANT USB; "usb_serial_simple"
             // Can be verified with lsmod | grep usb

             if (this.log.logging) { this.log.log(USBDevice.prototype.EVENT.LOG,'isKernelDriverActive',this.deviceInterface.isKernelDriverActive()); }

             if (this.deviceInterface.isKernelDriverActive())
             {

               if (this.log.logging) { this.log.log(USBDevice.prototype.EVENT.LOG,'Detaching kernel driver'); }

               this.deviceInterface.detachKernelDriver();

               this._needsKernelDriverAttach = true; // Flag indicates that kernel driver should be reattached on exit

             }

           // http://www.beyondlogic.org/usbnutshell/usb5.shtml

           this.inEndpoint = this.deviceInterface.endpoints[0];

           this.outEndpoint = this.deviceInterface.endpoints[1];

           this.deviceInterface.claim(); // Must be called before attempting transfer on endpoints

           retrn();
         }

         } catch (err)
         {
           if (this.log.logging) { this.log.log(USBDevice.prototype.EVENT.ERROR,err); }
           this._generateError(err,retrn);
         }

      };

      USBNode.prototype.init = function (preferredDeviceIndex,retrn) {

          var antInterface,
              err,
              antDevices;

           usb.setDebugLevel(4);

          this.device = this.devices[preferredDeviceIndex];

          if (this.device)
          {
            this._claimInterface(retrn);
          } else
          {
              this._generateError(this.ERROR.NO_DEVICE,retrn);
          }

      };

      USBNode.prototype._onInterfaceReleased = function (retrn,error)
       {

          if (error) {
              this.emit(USBDevice.prototype.EVENT.ERROR, error);
              retrn(err);
            }
          else {

              try {

                if (this._needsKernelDriverAttach)
                {
                  if (this.log.logging) { this.log.log(USBDevice.prototype.EVENT.LOG,'Reattaching kernel driver'); }
                  this.deviceInterface.attachKernelDriver();
                  this._needsKernelDriverAttach = false;

                }

                this.device.close();
                this.emit(USBDevice.prototype.EVENT.CLOSED);

                retrn();

              } catch (e) {
                  retrn(e);
                }

          }
      };

      USBNode.prototype.exit = function (retrn) {

          if (this.device === undefined) {
              retrn(this.ERROR.NO_DEVICE);
          }

          else {

            // Arguments to bind precedes actual arguments from passed by calling function
            // Some info on continuation passing style CPS http://matt.might.net/articles/by-example-continuation-passing-style/
            this.deviceInterface.release(this._onInterfaceReleased.bind(this,retrn));

          }
      };

      USBNode.prototype._onData = function (retrn,error,data)
      {

        if (error)
        {

          if (this.isTimeoutError(error)) { // Allow timeout, just reschedule listening
            if (this.log.logging) { this.log.log(USBDevice.prototype.EVENT.LOG, USBNode.prototype.ERROR.USB_TIMEOUT.message); }
               this.listen(undefined,retrn);
          } else {

              retrn(error);
            }
        }

        if (data && data.length > 0) {

          if (this.log.logging) { this.log.log(USBDevice.prototype.EVENT.LOG,'RX', data); }

          this.emit(USBDevice.prototype.EVENT.DATA,Util.prototype.toArrayBuffer(data));

        }

        this.listen(undefined,retrn);

      };

    USBNode.prototype.setInEndpointTimeout = function (timeout)
    {

        var prevTimeout = this.inEndpoint.timeout;

        if (prevTimeout !== timeout) {

            this.inEndpoint.timeout = timeout;

            if (this.log.logging ) {
              this.log.log(USBDevice.prototype.EVENT.LOG,'In endpoint timeout changed from', prevTimeout,'to',timeout);
            }
        } else
        {
          if (this.log.logging ) {
            this.log.log(USBDevice.prototype.EVENT.LOG,'In endpoint timeout no change, still', this.inEndpoint.timeout);
          }
        }
    };

    USBNode.prototype.setOutEndpointTimeout = function (timeout)
    {

      var prevTimeout = this.outEndpoint.timeout;

      if (prevTimeout !== timeout) {
        this.outEndpoint.timeout = timeout;
        if (this.log.logging ) {
          this.log.log(USBDevice.prototype.EVENT.LOG,'Out endpoint timeout changed from', prevTimeout,'to',timeout);
        }
    } else
    {
      if (this.log.logging ) {
        this.log.log(USBDevice.prototype.EVENT.LOG,'Out endpoint timeout no change, still', this.outEndpoint.timeout);
      }
    }
  };

    USBNode.prototype.listen = function (error,retrn)
       {

          var INFINITY = 0, endpointPacketSize = 512;
            //  LISTEN_TIMEOUT = 30000;

            if (error)
            {
              console.log('Got error!!!!',error);
              retrn(error);
            }

        //this.setInEndpointTimeout(1000);

        if (this.log.logging ) {
          this.log.log(USBDevice.prototype.EVENT.LOG,'Setting in transfer packet size to',endpointPacketSize);
        }

        //http://www.beyondlogic.org/usbnutshell/usb4.shtml#Bulk
      //  this.inEndpoint.transfer(endpointPacketSize,this._onData.bind(this,retrn));

      this.inEndpoint.startPoll();

      };

      USBNode.prototype.transfer = function (chunk, retrn)
      {

         //this.setOutEndpointTimeout(1000);

          if (this.log.logging ) {
            this.log.log(USBDevice.prototype.EVENT.LOG,'TX', Util.prototype.toNodeBuffer(chunk));
          }

        this.outEndpoint.transfer(Util.prototype.toNodeBuffer(chunk), retrn);

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
