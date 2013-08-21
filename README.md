libant
======

Library for the ANT protocol over USB

<h1>Usage</h1>

var host = require('./host.js');

Callback follows the pattern for callback(error,message)

API is in <b>unstable</b> alpha stage. It is based on the ANT message protocol and usage document http://www.thisisant.com/resources/ant-message-protocol-and-usage/

<h3>host.init(idVendor, idProduct, callback)</h3>

  initializes usb device, reset ANT and get ANT capabilities and device information
  
<h3>host.resetSystem(callback)</h3>

   reset ANT device
   
<h3>host.getANTVersion(callback)</h3>

   request for ANT version
   
<h3>host.getCapabilities(callback)</h3>

  request for capabilities
  
<h3>host.getDeviceSerialNumber(callback)</h3>

  request for device serial number
  
<h3>host.getChannelStatus(channel,callback)</h3>

  request for channel status, determines state of channel (unassigned,assigned,searching or tracking)
  
<h3>host.assignChannel(channel,deviceNum,deviceType,transmissionType,callback)</h3>
  
  reserves channel number and assigns channel type and betwork number to the channel, sets all other conf. to defaults.
  
<h3>host.unassignChannel(channel)</h3>

  unassigns channel. A channel must be unassigned before it can be reassigned.
  
<h3>host.setChannelI(channel,deviceNum,deviceType,transmissionType,callback)</h3>
  
  set channel ID
  
<h3>host.setChannelPeriod(channel,messagePeriod,callback)</h3>

  set channel period (message rate)
  
<h3>host.setLowPriorityChannelSearchTimeout(channel,searchTimeout,callback)</h3>

  set the low priority search timeout
  
<h3>host.setChannelSearchTimeout(channel,searchTimeout,callback)</h3>

  set the high priority search timeout
  
<h3>host.setChannelRFFreq(channel,RFFreq,callback)</h3>

  set channel RF frequency (i.e 66 = 2466 MHz)
  
<h3>host.setNetworkKey(netNumber,key,callback)</h3>

  set network key for specific net, key is 8-byte
  
<h3>host.setTransmitPower(transmitPower,callback)</h3>

  set transmit power for all channels
  
<h3>host.openChannel(channel,callback)</h3>

  open channel
  
<h3>host.closeChannel(channel,callback)</h3>

  close channel
  



