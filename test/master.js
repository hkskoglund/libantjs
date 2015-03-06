
var masterHost = new (require('../host'))({log : true});
var MasterChannel0 = masterHost.channel[0];
var dataSeed = 0;

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

function onMasterChannel0Open(error,msg)
{
  console.log('master open',error,msg);

  setTimeout(function () { MasterChannel0.getStatus(function (err,msg) { console.log('status',msg); }); },2500);
  setTimeout(function _close () {
    MasterChannel0.close(onMasterChannel0Closed);
  },5000);
}

function onMasterChannel0Closed(err,msg)
{
  console.log('closed sent!!!');
}

function onMasterAssigned(error)
{
  var sendFunc,
      sendData = function ()
                {
                  if (dataSeed+7 <= 0xFF)
                       dataSeed += 8;
                   else
                     dataSeed = 0;

                   //  if (dataSeed > 127)
                       sendFunc = MasterChannel0.sendAck;
                   //  else
                   //    sendFunc = MasterChannel0.send;

                       sendFunc.call(MasterChannel0,[dataSeed,dataSeed+1,dataSeed+2,dataSeed+3,dataSeed+4,dataSeed+5,dataSeed+6,dataSeed+7],
                          function (err,msg) {});
                }.bind(this);

   console.log('master assigned',error);

   // Standard broadcast
   MasterChannel0.on("EVENT_TX",function (err,resp) {
     console.log('EVENT_TX',resp);
     sendData();
   });

   // Acknowledged broadcast
   MasterChannel0.on("EVENT_TRANSFER_TX_COMPLETED",function (err,resp) {
      console.log('EVENT_TRANSFER_TX_COMPLETED',resp);
      sendData();
      });

   MasterChannel0.on("EVENT_TRANSFER_TX_FAILED",function (err,resp) {
     console.log('EVENT_TRANSFER_TX_FAILED',resp);
     sendData();
     });

   // Reopen
   MasterChannel0.on('EVENT_CHANNEL_CLOSED',function (err,msg) {
      console.log('EVENT_CHANNEL_CLOSED');

      setTimeout(function () { MasterChannel0.open(onMasterChannel0Open); }, 3000);

      });

     MasterChannel0.setId(1,1,1,function (err,msg)
     {
       console.log('setChannelId response',msg.toString());

       // Start sending data
       MasterChannel0.sendAck([0,1,2,3,4,5,6,7],function (err,msg) {
         if (!err)
           MasterChannel0.open(onMasterChannel0Open);
       });

     });

 }

function onMasterInited(error)
{
   console.log('master inited',error);

  MasterChannel0.assign(MasterChannel0.BIDIRECTIONAL_MASTER,MasterChannel0.NET.PUBLIC,onMasterAssigned);
   //masterHost.establishRXScanModeChannel(onPage);
   //masterHost.resetSystem(onReset);
  /* masterHost.configureEventBuffer(0x01,0xFFFF,0x00,function ()
   {
       masterHost.getEventBufferConfiguration(function _result (err,msg) {  console.log('result',msg); });
     });*/
    //masterHost.getCapabilities (function (err,msg) { console.log('capabilities',msg.toString()); });


    //  masterHost.getChannelStatus(0,function (err,msg) { console.log('channelstatus',msg.toString()); });
  //  console.log(masterHost.channel[0]);

  //  MasterChannel0.on("RESPONSE_NO_ERROR",function (response) { console.log('YEAH!!!',response); });

      //channel.getStatus(function (err,msg) { console.log('status',msg.toString()); console.log(channel.toString());});

}

function onError(error)
{
  console.trace();
  console.error('error',error);
}

console.log('devices',masterHost.getDevices());

try {
  masterHost.init(0,onMasterInited);

} catch (err)
  {
    onError(err);
  }
