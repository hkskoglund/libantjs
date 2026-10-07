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

function onSlaveChannel0Open(err, msg) {
}

function onBroadcast(err, msg) {

  if (!err)
    console.log(slaveHost.log._formatUint8Array(msg.payload));

}

function onSlaveAssigned(error) {
  console.log('slave assigned', error);

  var startFreq = 59,
    freq = startFreq,
    freqIntervalID,

    bumpFreq = function() {

      console.log('scan freq.', freq);

      slaveChannel0.setFrequency(freq++, function() {

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
    slaveChannel0.on('Broadcast Data', onBroadcast);
    increaseFreq();
    if (!singlefreq)
      freqIntervalID = setInterval(increaseFreq, searchWindowDelay);

  });
}

function onSlaveKey(error) {
  slaveChannel0.assign(slaveChannel0.SLAVE_RECEIVE_ONLY, 0, onSlaveAssigned);
}

function onSlaveInited(error) {
  console.log('slave initied', error);
  console.log('slave net 0 key PUBLIC');
  onSlaveKey();
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
