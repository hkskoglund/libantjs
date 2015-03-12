var antHost = new(require('../host'))({
  log: true
});

var antfsChannel = new (require('../profiles/antfs/host'))({
  log : true
},antHost,0,0);

console.log('antfs channel',antfsChannel);

var slavePort = 0;
var devices;

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
