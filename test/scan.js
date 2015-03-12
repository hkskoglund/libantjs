var HostLib = require('../host');
var slaveHost = new HostLib({
  log: false,
  debugLevel: 0
});
var slaveChannel0 = slaveHost.channel[0];
var searchWindowDelay = 2100;
var devices = slaveHost.getDevices();
var currentDevice;
var singlefreq = true;

function onExited(error) {
  console.log('exited', error);
}

function onPage(page) {
  console.log(page);
}


function onReset(error, notification) {
  console.log('onReset', error);
}

function onSlaveChannel0Open(err, msg) {
  //console.log('slave open');
}

function onBroadcast(err, msg) {

  if (!err)
    console.log(slaveHost.log._formatUint8Array(msg.payload));

  /*if (slaveChannel0.id.deviceNumber === 0 ||
      slaveChannel0.id.deviceType === 0 ||
      slaveChannel0.id.transmissionType === 0)
    slaveChannel0.getId(function (err,channelId) { console.log('cid'+channelId);}); */
}

function onSlaveAssigned(error) {
  console.log('slave assigned', error);

  var startFreq = 59,
    freq = startFreq,
    freqIntervalID,

    bumpFreq = function() {

      console.log('scan freq.', freq);

      slaveChannel0.setFreq(freq++, function() {

        slaveChannel0.openScan(onSlaveChannel0Open);

        if (freq > 124) {
          clearInterval(freqIntervalID);
          setTimeout(function() {
            slaveChannel0.close(function(err, msg) { //if (!err) console.log('slave closed');
              slaveHost.exit(function(err, msg) {
                if (!err) {
                  console.log('host exit');
                }

              });
            });
          }, searchWindowDelay);

        }
      });

    }.bind(this),

    increaseFreq = function() {

      if (freq > startFreq)
        slaveChannel0.close(function(err, msg) { //if (!err) console.log('slave closed');
          bumpFreq();
        });
      else {
        bumpFreq();
      }

    }.bind(this);

  slaveChannel0.id(0, 0, 0, function(err, msg) {
    //console.log('setChannelId response',msg.toString());
    slaveChannel0.on('Broadcast Data', onBroadcast);
    //console.log('slave channel' + slaveChannel0);
    //  slaveHost.libConfig(0x80,function (err,msg)
    //  {
    increaseFreq();
    if (!singlefreq)
      freqIntervalID = setInterval(increaseFreq, searchWindowDelay);
    //  });

  });
}

function onSlaveKey(error) {
  slaveChannel0.assign(slaveChannel0.SLAVE_RECEIVE_ONLY, 0, onSlaveAssigned);
}

function onSlaveInited(error) {
  var key;
  //key = slaveChannel0.NET.KEY['ANT+'];
  //  key = [0,0,0,0,0,0,0,0];
  console.log('slave initied', error);

  if (key) {
    console.log('slave net 0 key', key);
    slaveChannel0.key(0, key, onSlaveKey);
  } else {
    console.log('slave net 0 key PUBLIC');
    onSlaveKey();
  }
}

function onError(error) {
  console.trace();
  console.error('error', error);
}

console.log('scan : continous scanning mode, frequency 2400-2524 Mhz');

currentDevice = 0;
if (devices.length > currentDevice) {

  console.log('device bus ' + devices[currentDevice].busNumber + ':' + devices[currentDevice].deviceAddress + ' productId 0x' + devices[currentDevice].deviceDescriptor.idProduct.toString(16));

  try {

    slaveHost.init(currentDevice, onSlaveInited);
  } catch (err) {
    onError(err);
  }
} else {
  console.error('Found no devices');
}
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
