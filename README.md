libant
======

Library for the ANT protocol over USB

Host ANT API

<b>init(idVendor, idProduct, callback)</b>

  initializes usb device, reset ANT and get ANT capabilities and device information
  
<b>resetSystem(callback)</b>

   reset ANT device
   
<b>getANTVersion(callback)</b>

   request for ANT version
   
<b>getCapabilities(callback)</b>

  request for capabilities
  
<b>getDeviceSerialNumber(callback)</b>

  request for device serial number
  
<b>getChannelStatus(channel,callback)</b>

  request for channel status, determines state of channel (unassigned,assigned,searching or tracking)
  
<b>assignChannel(channel,deviceNum,deviceType,transmissionType,callback)</b>
  
  reserves channel number and assigns channel type and betwork number to the channel, sets all other conf. to defaults.
  
<b>unassignChannel(channel)</b>

  unassigns channel. A channel must be unassigned before it can be reassigned.
  
<b>setChannelI(channel,deviceNum,deviceType,transmissionType,callback)</b>
  
  set channel ID
  
<b>setChannelPeriod(channel,messagePeriod,callback)</b>

  set channel period (message rate)
  
<b>setLowPriorityChannelSearchTimeout(channel,searchTimeout,callback)</b>

  set the low priority search timeout
  
<b>setChannelSearchTimeout(channel,searchTimeout,callback)</b>

  set the high priority search timeout
  
<b>setChannelRFFreq(channel,RFFreq,callback)</b>

  set channel RF frequency (i.e 66 = 2466 MHz)
  
<b>setNetworkKey(netNumber,key,callback)</b>

  set network key for specific net, key is 8-byte
  
<b>setTransmitPower(transmitPower,callback)</b>

  set transmit power for all channels
  
<b>openChannel(channel,callback)</b>

  open channel
  
<b>closeChannel(channel,callback)</b>

  close channel
  



