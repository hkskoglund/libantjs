libant
======

Library for the ANT protocol over USB

<h1>Usage</h1>

var host = require('./host.js');

Callback follows the pattern for callback(error,message)

API is in <b>unstable</b> alpha stage.

<h3>host.init(idVendor, idProduct, callback)</h3>

  initializes usb device, reset ANT and get ANT capabilities and device information
  
<h3>host.resetSystem(callback)</h3>

   reset ANT device
   
<h3>host.getANTVersion(callback)</h3>

   request for ANT version
   
<h3>getCapabilities(callback)</h3>

  request for capabilities
  
<h3>getDeviceSerialNumber(callback)</h3>

  request for device serial number
  
<h3>getChannelStatus(channel,callback)</h3>

  request for channel status, determines state of channel (unassigned,assigned,searching or tracking)
  
<h3>assignChannel(channel,deviceNum,deviceType,transmissionType,callback)</h3>
  
  reserves channel number and assigns channel type and betwork number to the channel, sets all other conf. to defaults.
  
<h3>unassignChannel(channel)</h3>

  unassigns channel. A channel must be unassigned before it can be reassigned.
  
<h3>setChannelI(channel,deviceNum,deviceType,transmissionType,callback)</h3>
  
  set channel ID
  
<h3>setChannelPeriod(channel,messagePeriod,callback)</h3>

  set channel period (message rate)
  
<h3>setLowPriorityChannelSearchTimeout(channel,searchTimeout,callback)</h3>

  set the low priority search timeout
  
<h3>setChannelSearchTimeout(channel,searchTimeout,callback)</h3>

  set the high priority search timeout
  
<h3>setChannelRFFreq(channel,RFFreq,callback)</h3>

  set channel RF frequency (i.e 66 = 2466 MHz)
  
<h3>setNetworkKey(netNumber,key,callback)</h3>

  set network key for specific net, key is 8-byte
  
<h3>setTransmitPower(transmitPower,callback)</h3>

  set transmit power for all channels
  
<h3>openChannel(channel,callback)</h3>

  open channel
  
<h3>closeChannel(channel,callback)</h3>

  close channel
  



