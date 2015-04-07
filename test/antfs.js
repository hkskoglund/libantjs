var usbHost = require('../usb/USBNode');

var antHost = new(require('../host'))({
  log: true,
  usb: usbHost,
  debugLevel : 0
});

var antfsHost = new (require('../profiles/antfs/host'))({
  log : true
},antHost,0,0);

var slavePort = 0;
var devices;

var fs = require('fs');

function onError(error) {
  console.trace();
  console.error('error', error);
}

function onConnect(error)
{
  if (error) {
    console.log('onConnect',error);
    return;
  }

  antfsHost.on('download', onDownload);
  antfsHost.on('download_progress', onDownloadProgress);

}

function onDownloadProgress(error, session)
{
    console.log('progress ' + Number(session.progress).toFixed(1)+'% ' + session.filename);
}

function onDownload(error, session)
{
  if (!error && session && session.index)
    fs.writeFile(session.filename, new Buffer(session.packets), function(err) {
      if (err)
        console.log(Date.now() + " Error writing " + session.filename, err);
      else
        console.log(Date.now() + " Saved " + session.filename);
    });

}

function onANTexited (err)
{
  if (!err)
    console.log(Date.now() + 'Exited from ANT',antHost.usb);
}

function onANTInited(error, notificationStartup) {

 if (error) {
   console.log('onantinited',error);
   return;
 }
  antHost.setChannel(antfsHost);
  antfsHost.connect(onConnect);

  //antHost.exit(onANTexited);

 }


devices = antHost.getDevices();
//console.log('devices',antHost.getDevices());

try {

  console.log('antfs device', devices[slavePort]);
  debugger;
  antHost.init(slavePort, onANTInited);
} catch (err) {
  onError(err);
}
