var antHost = new(require('../host'))({
  log: true
});

var antfsChannel = new (require('../profiles/antfs/host'))({
  log : true
},antHost,0,0);

console.log('antfs channel',antfsChannel);

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

  antfsChannel.on('download', onDownload);

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

function onANTInited(error) {

 if (error) {
   console.log('onantinited',error);
   return;
 }
  antHost.setChannel(antfsChannel);
  antfsChannel.connect(onConnect);
 }


devices = antHost.getDevices();
//console.log('devices',antHost.getDevices());

try {

  console.log('antfs device', devices[slavePort]);
  antHost.init(slavePort, onANTInited);
} catch (err) {
  onError(err);
}
