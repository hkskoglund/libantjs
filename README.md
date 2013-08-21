libant
======

Library for the ANT protocol over USB

Host ANT API

init(idVendor, idProduct, callback)

  initializes usb device, reset ANT and get ANT capabilities and device information
  
resetSystem(callback)

   reset ANT device
   
getANTVersion(callback)

   request for ANT version
   
getCapabilities(callback)

  request for capabilities
  
getDeviceSerialNumber(callback)

  request for device serial number
  
getChannelStatus(channel,callback)

  request for channel status, determines state of channel (unassigned,assigned,searching or tracking)
  
assignChannel(channel,deviceNum,deviceType,transmissionType,callback)
  
  reserves channel number and assigns channel type and betwork number to the channel, sets all other conf. to defaults.
  
unassignChannel(channel)

  unassigns channel. A channel must be unassigned before it can be reassigned.
  
setChannelI(channel,deviceNum,deviceType,transmissionType,callback)
  
  set channel ID
  
setChannelPeriod(channel,messagePeriod,callback)

  set channel period (message rate)
  
setLowPriorityChannelSearchTimeout(channel,searchTimeout,callback)

  set the low priority search timeout
  
setChannelSearchTimeout(channel,searchTimeout,callback)

  set the high priority search timeout
  
setChannelRFFreq(channel,RFFreq,callback)

  set channel RF frequency (i.e 66 = 2466 MHz)
  
setNetworkKey(netNumber,key,callback)

  set network key for specific net, key is 8-byte
  
setTransmitPower(transmitPower,callback)

  set transmit power for all channels
  
openChannel(channel,callback)

  open channel
  
closeChannel(channel,callback)

  close channels
  



