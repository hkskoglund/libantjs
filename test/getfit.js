var channel = 0,
  net = 0,

  devices,
  hostname = 'getfit',
  argv = require('minimist')(process.argv.slice(2)),
  antHost = new(require('../host'))({
    log: argv.v,
    debugLevel: argv.L || 0 // 0 - 4 enables libusb debug info.
  }),
  antfsHost,
  deviceNumber = argv.n || 0,
  usbPort = argv.p || 0; // 0 for any device

function onError(error) {
  console.trace();
  console.error('error', error);
}

function onConnect(error) {
  if (error) {
    console.log('onConnect', error);
    return;
  }

}

function onANTexited(err) {
  //  if (!err)
  //    console.log(Date.now() + ' Exit ANT');
}

function onANTInited(error, notificationStartup) {

  if (error) {
    console.log('onantinited', error);
    return;
  }

  antHost.on('transport_end', function() {
    antHost.exit(onANTexited);
  });

  antHost.on('open', function(ch) {
    //console.log('Host ' + hostname + ' connecting to antfs device on channel ' + ch);
  });

  antHost.connectANTFS(channel, net, deviceNumber, hostname, argv.d, argv.e, argv.l, onConnect);

}

devices = antHost.getDevices();

if (!devices || !devices.length)
  console.error('No ANT devices available');

else if (argv.u) {
  console.log(antHost.listDevices());
} else {

  try {

      antHost.init(usbPort, onANTInited);

  } catch (err) {
    onError(err);
  }
}


// options
// -n device number to search for
// -d download,
// -e erase,
// -l list directory
// -u show usb ANT devices
// -p usb device to use
// -v verbose logging
// -L {level} libusb log level 0-4
