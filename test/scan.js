import Host from '../host.js';


const slaveHost = new Host({ log: false, debugLevel: 0 });
const slaveChannel0 = slaveHost.channel[0];
const searchWindowDelay = 2100;
const startFreq = 59;
const currentDevice = 0;
const singlefreq = true;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function onBroadcast(err, msg) {

  if (!err)
    console.log(slaveHost.log._formatUint8Array(msg.payload));

}

async function scanFrequency(freq) {
  console.log('scan freq.', freq);

  if (freq > startFreq)
    await slaveChannel0.close();

  await slaveChannel0.setFrequency(freq);
  await slaveChannel0.openScan();
}

async function main() {
  console.log('scan : continous scanning mode, frequency 2400-2524 Mhz');

  const devices = await slaveHost.refreshDevices();
  if (devices.length <= currentDevice) {
    console.error('Found no devices');
    return;
  }

  console.log('device ' + slaveHost.deviceToString(devices[currentDevice]));

  await slaveHost.init(currentDevice);
  console.log('slave initied');
  console.log('slave net 0 key PUBLIC');

  await slaveChannel0.assign(slaveChannel0.SLAVE_RECEIVE_ONLY, 0);
  await slaveChannel0.setId(0, 0, 0);
  slaveChannel0.on('Broadcast Data', onBroadcast);

  for (let freq = startFreq; freq <= 124; freq++) {
    await scanFrequency(freq);
    if (singlefreq)
      break;
    await delay(searchWindowDelay);
  }

  await delay(searchWindowDelay);
  await slaveChannel0.close();
  await slaveHost.exit();
  console.log('host exit');
}

main().catch((error) => {
  console.trace();
  console.error('error', error);
});
/*

freq. 72

Uint8Array < ad 01 00 0e 50 00 19 2d >
Uint8Array < ad 01 00 0e 50 00 19 2d >
Uint8Array < ad 01 00 0e 50 00 19 2d >
Uint8Array < ad 01 00 0e 50 00 19 2d >
Uint8Array < ad 01 00 0e 50 00 19 2d >
Uint8Array < ad 01 00 0e 50 00 19 2d >
Uint8Array < ad 01 00 0e 50 00 19 2d >
*/
