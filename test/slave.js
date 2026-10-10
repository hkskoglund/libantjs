import Host from '../host.js';


const slaveHost = new Host({ log: true });
const slavePort = 1;
const slaveChannel0 = slaveHost.channel[0];
let burstNr = 0;

function onAckBroadcast(err) {
  console.log(Date.now(), 'ACK broadcast', err);
}

function onBroadcast(err) {
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

async function main() {
  await slaveHost.refreshDevices();
  console.log('slave device', slaveHost.getDevices()[slavePort]);

  await slaveHost.init(slavePort);
  console.log('slave initied');

  await slaveChannel0.slave();
  console.log('slave assigned');

  const idResponse = await slaveChannel0.setId(1, 1, 1);
  console.log('setChannelId response', idResponse.toString());

  slaveChannel0.on('data', onBroadcast);
  slaveChannel0.on('ackdata', onAckBroadcast);
  slaveChannel0.on('burstdata', onBurstData); // Each packet
  slaveChannel0.on('burst', onBurst);
  console.log('slave channel' + slaveChannel0);

  await slaveChannel0.open();
  console.log('slave open');
}

function onError(error) {
  console.trace();
  console.error('error', error);
}

main().catch(onError);
