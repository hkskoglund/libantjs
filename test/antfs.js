var antHost = new(require('../host'))({
    log: true,
    debugLevel: 0 // 0 - 4 enables libusb debug info.
  }),

  usbPort = 0,
  channel = 0,
  net = 0,
  deviceNumber = 0, // 0 for any device
  devices,
  hostname = 'getfit';

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

  antHost.on('open', function (ch) { console.log('Host ' + hostname + ' connecting to antfs device on channel ' + ch); });

  antHost.connectANTFS(channel, net, deviceNumber, hostname, onConnect);

}

devices = antHost.getDevices();
//console.log('devices',antHost.getDevices());

try {

  //console.log('antfs device', devices[usbPort]);

  antHost.init(usbPort, onANTInited);
} catch (err) {
  onError(err);
}
