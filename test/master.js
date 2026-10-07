var masterHost = new(require('../host'))({
  log: true,
  debugLevel: 0
});
var masterPort = 0;
var MasterChannel0 = masterHost.channel[0];
var dataSeed = 0;
var devices;

function onMasterChannel0Open(error, msg) {
  console.log('master open', error, msg);
}

function generateBurstData() {
  var burst = new Uint8Array(24*10000),
    i;
  for (i = 0; i < burst.byteLength; i++)
    burst[i] = i & 0xFF;

  return burst;
}

function onMasterAssigned(error) {
  var sendFunc,
    burstData = generateBurstData(),
    data,
    sendData = function() {
      if (dataSeed + 7 <= 0xFF)
        dataSeed += 8;
      else
        dataSeed = 0;

      if (dataSeed === 8) {
        sendFunc = MasterChannel0.sendBurst;
        data = burstData;
        sendFunc.call(MasterChannel0, data, 1,function _sendFunc(err, msg) {
          if (err) console.error('send fail!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', err);
        });

      }
    }.bind(this);

  console.log('master assigned', error);

  // Standard broadcast
  MasterChannel0.on("EVENT_TX", function(err, resp) {
    console.log('EVENT_TX', resp);
    sendData();
  });

  // Acknowledged broadcast/Burst data
  MasterChannel0.on("EVENT_TRANSFER_TX_COMPLETED", function(err, resp) {
    console.log('EVENT_TRANSFER_TX_COMPLETED', resp);
    sendData();
  });

  MasterChannel0.on("EVENT_TRANSFER_TX_FAILED", function(err, resp) {
    console.log('EVENT_TRANSFER_TX_FAILED', resp);
    sendData();
  });

  // Reopen
  MasterChannel0.on('EVENT_CHANNEL_CLOSED', function(err, msg) {
    console.log('EVENT_CHANNEL_CLOSED');

    setTimeout(function() {
      MasterChannel0.open(onMasterChannel0Open);
    }, 3000);

  });

  MasterChannel0.setId(1, 1, 1, function(err, msg) {
    console.log('setChannelId response', msg.toString());

    MasterChannel0.open(onMasterChannel0Open);

  });

}

function onMasterInited(error) {
  console.log('master inited', error);

          MasterChannel0.master(0, onMasterAssigned);

}

function onError(error) {
  console.trace();
  console.error('error', error);
}

devices = masterHost.getDevices();

try {
  console.log('master device', devices[masterPort]);

  masterHost.init(masterPort, onMasterInited);

} catch (err) {
  onError(err);
}
