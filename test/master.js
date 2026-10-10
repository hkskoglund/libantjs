const Host = require('../host');

const masterHost = new Host({ log: true, debugLevel: 0 });
const masterPort = 0;
const masterChannel0 = masterHost.channel[0];
let dataSeed = 0;

function generateBurstData() {
  const burst = new Uint8Array(24 * 10000);
  for (let i = 0; i < burst.byteLength; i++)
    burst[i] = i & 0xFF;

  return burst;
}

async function main() {
  const burstData = generateBurstData();

  await masterHost.refreshDevices();
  console.log('master device', masterHost.getDevices()[masterPort]);

  await masterHost.init(masterPort);
  console.log('master inited');

  await masterChannel0.master();
  console.log('master assigned');

  const sendData = async () => {
    if (dataSeed + 7 <= 0xFF)
      dataSeed += 8;
    else
      dataSeed = 0;

    if (dataSeed === 8) {
      try {
        await masterChannel0.sendBurst(burstData, 1);
      } catch (err) {
        console.error('send fail!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', err);
      }
    }
  };

  // Standard broadcast
  masterChannel0.on('EVENT_TX', (err, resp) => {
    console.log('EVENT_TX', resp);
    sendData();
  });

  // Acknowledged broadcast/Burst data
  masterChannel0.on('EVENT_TRANSFER_TX_COMPLETED', (err, resp) => {
    console.log('EVENT_TRANSFER_TX_COMPLETED', resp);
    sendData();
  });

  masterChannel0.on('EVENT_TRANSFER_TX_FAILED', (err, resp) => {
    console.log('EVENT_TRANSFER_TX_FAILED', resp);
    sendData();
  });

  // Reopen
  masterChannel0.on('EVENT_CHANNEL_CLOSED', () => {
    console.log('EVENT_CHANNEL_CLOSED');

    setTimeout(() => {
      masterChannel0.open().then((msg) => console.log('master open', msg), onError);
    }, 3000);
  });

  const idResponse = await masterChannel0.setId(1, 1, 1);
  console.log('setChannelId response', idResponse.toString());

  console.log('master open', await masterChannel0.open());
}

function onError(error) {
  console.trace();
  console.error('error', error);
}

main().catch(onError);
