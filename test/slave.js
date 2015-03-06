
var slaveHost = new (require('../host'))({log : true});
var slaveChannel0 = slaveHost.channel[0];
var key;

function onExited(error)
{
  console.log('exited',error);
}

function onPage(page)
{
  console.log(page);
}


function onReset(error,notification)
{
  console.log('onReset',error);
}

function onSlaveChannel0Open(err,msg)
{
 console.log('slave open');
}

function onBroadcast(err,msg)
{
  console.log('data',err,msg);
  if (!slaveChannel0.hasId())
    slaveChannel0.getId(function (err,channelId) { console.log('cid'+channelId);});
}

function onSlaveAssigned(error)
{
   console.log('slave assigned',error);

  // slaveChannel0.setFreq(slaveChannel0.NET.FREQ['ANT+'],function () {

  //     slaveChannel0.setPeriod(slaveChannel0.NET.PERIOD.ENVIRONMENT.LOW_POWER,function () {

           slaveChannel0.setId(0,0,0,function (err,msg)
           {
             console.log('setChannelId response',msg.toString());
             slaveChannel0.on('data',onBroadcast);
             console.log('slave channel' + slaveChannel0);
             slaveChannel0.open(onSlaveChannel0Open);
           });
    //     });
 // });
}


function onSlaveKey(error)
{
  slaveChannel0.assign(slaveChannel0.BIDIRECTIONAL_SLAVE,0,onSlaveAssigned);
}

function onSlaveInited(error)
{
  console.log('slave initied',error);

  //key = slaveChannel0.NET.KEY['ANT+'];
 if (key)
   slaveChannel0.setKey(0,key,onSlaveKey);
 else
   onSlaveKey();

}

function onError(error)
{
  console.trace();
  console.error('error',error);
}

console.log('devices',slaveHost.getDevices());

try {

  slaveHost.init(1,onSlaveInited);
} catch (err)
  {
    onError(err);
  }
