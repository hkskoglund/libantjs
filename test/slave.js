var slaveHost = new(require('../host'))({
  log: true
});
var slavePort = 1;
var slaveChannel0 = slaveHost.channel[0];
var devices;
var burstNr = 0;

function onSlaveChannel0Open(err, msg) {
  console.log('slave open');
}

function onAckBroadcast(err, msg) {
  console.log(Date.now(), 'ACK broadcast', err);
}

function onBroadcast(err, msg) {
  console.log(Date.now(), 'broadcast', err);
}

function onBurst() {
  console.log(Date.now(), 'Received burst ', slaveChannel0.burst.byteLength);
}

function onBurstData(err, msg) {
  if (msg.sequenceNr === 0)
    burstNr = 1;
  else
    burstNr++;
  console.log(Date.now(), 'burst', err, 'channel ' + msg.channel + ' seq ' + msg.sequenceNr + ' nr ' + burstNr);
}

function onSlaveAssigned(error) {
  console.log('slave assigned', error);

  slaveChannel0.setId(1, 1, 1, function(err, msg) {
    console.log('setChannelId response', msg.toString());
    slaveChannel0.on('data', onBroadcast);
    slaveChannel0.on('ackdata', onAckBroadcast);
    slaveChannel0.on('burstdata', onBurstData); // Each packet
    slaveChannel0.on('burst', onBurst);
    console.log('slave channel' + slaveChannel0);
    slaveChannel0.open(onSlaveChannel0Open);
  });
}


function onSlaveKey(error) {
  slaveChannel0.slave(0, onSlaveAssigned);
}

function onSlaveInited(error) {
  console.log('slave initied', error);
  onSlaveKey();
}

function onError(error) {
  console.trace();
  console.error('error', error);
}

devices = slaveHost.getDevices();

try {

  console.log('slave device', devices[slavePort]);
  slaveHost.init(slavePort, onSlaveInited);
} catch (err) {
  onError(err);
}
