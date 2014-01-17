define(function(a,b,c){"use strict";function J(){this._channel={},this.callback={},this.resendTimeoutID={},this.log=new e(!1),this._responseCallback=function(a){var b=a.id,c=!1,d=function(c){delete this.callback[b],e(c,a)}.bind(this);if(b===h.prototype.MESSAGE.CHANNEL_RESPONSE&&(b=a.initiatingId,this.log.logging&&this.log.log("log","Initiating message id for channel response is 0x"+b.toString(16)+" "+h.prototype.MESSAGE[b],a),a.responseCode!==G.prototype.RESPONSE_EVENT_CODES.RESPONSE_NO_ERROR&&(this.log.logging&&this.log.log("warn","Normally a response no error is received, but got ",a.message),c=!0)),!c){var f,e=this.callback[b];f="number"!=typeof this.options.resetDelay?500:this.options.resetDelay,this.resendTimeoutID[b]?(clearTimeout(this.resendTimeoutID[b]),delete this.resendTimeoutID[b]):this.log.logging&&this.log.log("warn","No timeout registered for response "+a.name),"function"!=typeof e?this.log.logging&&this.log.log("warn","No callback registered for "+a+" "+a.toString()):b===h.prototype.MESSAGE.NOTIFICATION_STARTUP?f>0?setTimeout(d,f):d():d()}}.bind(this),this._setResponseCallback=function(a,b){var c=a.responseId;return c===h.prototype.MESSAGE.CHANNEL_RESPONSE&&(c=a.id),void 0!==this.callback[c]?(b(new Error("Awaiting response for a previous "+a.name+" target msg. id "+c+" , cannot register a new request callback")),!1):(this.callback[c]=b,!0)}.bind(this),this._sendMessage=function(a,b){if(this._setResponseCallback(a,b)){var d=this.options.transferProcessingLatency||10,e=2*f.prototype.ANT_DEVICE_TIMEOUT+d,g=a.responseId,i=this.options.maxTransferRetries||5,j=0;g===h.prototype.MESSAGE.CHANNEL_RESPONSE&&(g=a.id);var k=function(b){b&&this.log.logging&&this.log.log("error","TX failed of "+a.toString())}.bind(this),l=function(){0===j?this.log.logging&&this.log.log("log","Sending message ",a,"retry timeout in "+e+" ms."):this.log.logging&&this.log.log("warn","Retry "+j+" sending message",a),this.resendTimeoutID[g]=setTimeout(function(){void 0!==this.callback[a.responseId]&&this.log.logging&&this.log.log("warn","No response to request for "+a.name+" in "+e+" ms"),++j<=i?l():(this.log.logging&&this.log.log("log","Reached max. number of retries for transfer of message",a),b(new Error("Reached maximum number of retries for transfer of message")))}.bind(this),e),this.usb.transfer(a.getRawMessage(),k)}.bind(this);l()}}.bind(this),this._ANTMessage=new h}function K(a,b,c,d,e){if("undefined"==typeof c)throw new TypeError("Number specified is undefined");switch(b){case"channel":if("undefined"==typeof a)throw new Error("getCabilities should be run to determine max. channels and networks");if(a&&(c>a.MAX_CHAN-1||0>c))throw new RangeError("Channel nr "+c+" out of bounds");break;case"network":if("undefined"==typeof a)throw new Error("getCabilities should be run to determine max. channels and networks");if(a&&(c>a.MAX_NET-1||0>c))throw new RangeError("Network nr "+c+" out of bounds");break;case"transmitPower":if(c>e||d>c)throw new RangeError("Transmit power out of bounds");break;case"searchThreshold":if(c>e||d>c)throw new RangeError("Proximity search threshold out of bounds");break;default:throw new Error("Unknown type, cannot verify range")}}var d=a("messages/BroadcastDataMessage"),e=a("logger"),f=a("usb/USBDevice"),g=a("Channel"),h=a("messages/ANTMessage"),i=a("messages/ResetSystemMessage"),j=a("messages/OpenChannelMessage"),k=a("messages/OpenRxScanModeMessage"),l=a("messages/CloseChannelMessage"),m=a("messages/NotificationStartup"),n=a("messages/NotificationSerialError"),o=a("messages/RequestMessage"),p=a("messages/CapabilitiesMessage"),q=a("messages/ANTVersionMessage"),r=a("messages/DeviceSerialNumberMessage"),s=a("messages/AssignChannelMessage"),t=a("messages/UnAssignChannelMessage"),u=a("messages/SetChannelIDMessage"),v=a("messages/SetChannelPeriodMessage"),w=a("messages/SetChannelSearchTimeoutMessage"),x=a("messages/SetLowPriorityChannelSearchTimeoutMessage"),y=a("messages/SetChannelRFFreqMessage"),z=a("messages/SetNetworkKeyMessage"),D=(a("messages/SetTransmitPowerMessage"),a("messages/SetChannelTxPowerMessage"),a("messages/SetProximitySearchMessage"),a("messages/SetSerialNumChannelIdMessage")),E=a("messages/LibConfigMessage"),F=a("messages/libConfig"),G=a("messages/ChannelResponseMessage"),H=a("messages/ChannelStatusMessage"),I=a("messages/channelId");return J.prototype.VERSION="0.1.0",J.prototype.EVENT={BROADCAST:"broadcast",BURST:"burst",PAGE:"page"},J.prototype.establishChannel=function(a,b){var k,l,c=a.channelNumber,d=a.networkNumber,e=a.configurationName,f=a.channel,h=a.channelPeriod,i=a.open,j=f.parameters[e];if(void 0===j)return b(new Error("Could not find configuration "+e)),void 0;if(k=f.isMaster(e),this.log.logging&&this.log.log("log","Establishing channel for configuration",e,j,"Master channel : "+k),K(this.capabilities,"channel",c),K(this.capabilities,"network",d),"undefined"==typeof j.channelType)return b(new Error("No channel type specified")),void 0;if("string"==typeof j.channelType)switch(j.channelType.toLowerCase()){case"slave":j.channelType=g.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL;break;case"master":j.channelType=g.prototype.TYPE.BIDIRECTIONAL_MASTER_CHANNEL;break;case"shared slave":j.channelType=g.prototype.TYPE.SHARED_BIDIRECTIONAL_SLAVE_CHANNEL;break;case"shared master":j.channelType=g.prototype.TYPE.SHARED_BIDIRECTIONAL_MASTER_CHANNEL;break;case"slave only":j.channelType=g.prototype.TYPE.SLAVE_RECEIVE_ONLY_CHANNEL;break;case"master only":j.channelType=g.prototype.TYPE.MASTER_TRANSMIT_ONLY_CHANNEL;break;default:return b(new Error("Unknown channel type specified "+j.channelType)),void 0}else if("undefined"==typeof g.prototype.TYPE[j.channelType])return b(new Error("Unknown channel type specified "+j.channelType)),void 0;if(!j.channelId)return b(new Error("No channel ID specified")),void 0;if(j.channelId instanceof I||k||(("undefined"==typeof j.channelId.deviceNumber||"*"===j.channelId.deviceNumber||"number"!=typeof j.channelId.deviceNumber)&&(j.channelId.deviceNumber=0),("undefined"==typeof j.channelId.deviceType||"*"===j.channelId.deviceType||"number"!=typeof j.channelId.deviceType)&&(j.channelId.deviceType=0),("undefined"==typeof j.channelId.transmissionType||"*"===j.channelId.transmissionType||"number"!=typeof j.channelId.transmissionType)&&(j.channelId.transmissionType=0),j.channelId=new I(j.channelId.deviceNumber,j.channelId.deviceType,j.channelId.transmissionType)),!(j.channelId instanceof I)&&k){if("undefined"==typeof j.channelId.deviceNumber)return b(new Error("No device number specified in channel Id")),void 0;if("undefined"==typeof j.channelId.deviceType)return b(new Error("No device type specified in channel Id")),void 0;if("undefined"==typeof j.channelId.transmissionType)return b(new Error("No transmission type specified in channel Id")),void 0;if("serial number"===j.channelId.deviceNumber&&("undefined"==typeof this.deviceSerialNumber||0===(65535&this.deviceSerialNumber)))return b(new Error("No ANT device serial number available or the 2 least significant bytes of serial number is 0, device serial number 0x"+this.deviceSerialNumber.toString(16))),void 0;j.channelId=new I(65535&this.deviceSerialNumber,j.channelId.deviceType,j.channelId.transmissionType)}if(j.extendedAssignment&&"string"==typeof j.extendedAssignment)switch(j.extendedAssignment.toLowerCase()){case"background scanning":j.extendedAssignment=g.prototype.EXTENDED_ASSIGNMENT.BACKGROUND_SCANNING_ENABLE;break;case"frequency agility":j.extendedAssignment=g.prototype.EXTENDED_ASSIGNMENT.FREQUENCY_AGILITY_ENABLE;break;case"fast channel initiation":j.extendedAssignment=g.prototype.EXTENDED_ASSIGNMENT.FAST_CHANNEL_INITIATION_ENABLE;break;case"asynchronous transmission":j.extendedAssignment=g.prototype.EXTENDED_ASSIGNMENT.ASYNCHRONOUS_TRANSMISSION_ENABLE;break;default:this.log.logging&&this.log.log("error","Unknown extended assignment "+j.extendedAssignment),j.extendedAssignment=void 0}j.RxScanMode&&0!==c&&(this.log.logging&&this.log.log("log","C# ",c," not allowed for continous Rx scan mode. Setting it to 0"),a.channelNumber=0,c=0),this.log.logging&&this.log.log("log","Establishing "+f.showConfiguration(e)+" C# "+c+" N# "+d),void 0===this._channel[c]?this._channel[c]={}:this.log.logging&&this.log.log("warn","Overwriting previous channel information for channel C# "+c,this._channel[c]),this._channel[c].channel=f,this._channel[c].network=d,this.getChannelStatus(c,function(e,g){if(e)b(e);else{if(g.channelStatus.state!==H.prototype.STATE.UN_ASSIGNED)return l="Channel "+c+" on network "+d+"is "+g.channelStatus.stateMessage,this.log.logging&&this.log.log("log",l),b(new Error(l)),void 0;var m=function(){this.assignChannel(c,j.channelType,d,j.extendedAssignment,function(a,d){a?b(a):(this.log.logging&&this.log.log("log",d.toString()),this.setChannelId(c,j.channelId.deviceNumber,j.channelId.deviceType,j.channelId.transmissionType,function(a,c){a?b(a):(this.log.logging&&this.log.log("log",c.toString()),o())}.bind(this)))}.bind(this))}.bind(this),n=function(){var a;return a=Array.isArray(j.channelPeriod)?h||j.channelPeriod[0]:h||j.channelPeriod,void 0!==a||j.RxScanMode?(j.RxScanMode?r():this.setChannelPeriod(c,a,function(a,c){a?b(a):(this.log.logging&&this.log.log("log",c.toString()),p())}.bind(this)),void 0):(b(new Error("Channel period is undefined")),void 0)}.bind(this),o=function(){j.RFfrequency?this.setChannelRFFreq(c,j.RFfrequency,function(a,c){a?b(a):(this.log.logging&&this.log.log("log",c.toString()),n())}.bind(this)):n()}.bind(this);j.networkKey?this.setNetworkKey(d,j.networkKey,function(a,c){a?b(a):(this.log.logging&&this.log.log("log",c.toString()),m())}.bind(this)):m();var p=function(){!k&&j.HPsearchTimeout?this.setChannelSearchTimeout(c,j.HPsearchTimeout,function(a,c){a?b(a):(q(),this.log.logging&&this.log.log("log",c.toString()))}.bind(this)):q()}.bind(this),q=function(){!k&&j.LPsearchTimeout?this.setLowPriorityChannelSearchTimeout(c,j.LPsearchTimeout,function(a,c){a?b(a):(this.log.logging&&this.log.log("log",c.toString()),r())}.bind(this)):r()}.bind(this),r=function(){f.establish=a;var d=function(a,c){a?b(a,f):(this.log.logging&&this.log.log("log",c.toString()),b(void 0,f))}.bind(this);i?j.RxScanMode?this.openRxScanMode(c,d):this.openChannel(c,d):b()}.bind(this)}}.bind(this))},J.prototype.init=function(a,b){this.options=a,this.usb=a.usb,this.log.logging=a.log,this.log.logging&&this.log.log("log","Host options",a);var c=function(a){if(!this.options||!this.capabilities)return a(new Error("Could not find capabilities for extended messaging")),void 0;var c,d,b=this.options.libconfig;return"undefined"==typeof b?(this.log.logging&&this.log.log("warn","No library configuration options specified for extended messaging"),a(new Error("No library configuration options specified for extended messaging")),void 0):this.capabilities.advancedOptions2.CAPABILITIES_EXT_MESSAGE_ENABLED?(c=new F,"number"==typeof b?c.setFlagsByte(b):"string"==typeof b?(d=b.toLowerCase().split(","),-1!==d.indexOf("channelid")&&c.setEnableChannelId(),-1!==d.indexOf("rssi")&&c.setEnableRSSI(),-1!==d.indexOf("rxtimestamp")&&c.setEnableRXTimestamp()):a(new Error("Unable to parse library configuration options")),this.libConfig(c.getFlagsByte(),function(b){b?a(b):(this.currentLibConfig=c,this.log.logging&&this.log.log("log",c.toString()),a())}.bind(this)),void 0):(this.log.logging&&this.log.log("warn","Device does not have capability for extended messaging"),a(new Error("Device does not have capability for extended messaging")),void 0)}.bind(this),d=function(a){this.getANTVersion(function(b,c){b?a(b):(this.log.logging&&this.log.log("log",c.toString()),this.getDeviceSerialNumber(function(b,c){b||this.log.logging&&this.log.log("log",c.toString()),a(b)}.bind(this)))}.bind(this))}.bind(this),e=function(b){this.getCapabilities(function(c){c?b(c):a.reset?d(function(a){b(a)}):this.getChannelStatusAll(function(a){a&&b(a),d(function(a){b(a)})}.bind(this))}.bind(this))}.bind(this),f=function(b){a.reset?this.resetSystem(function(a){a?b(a):e(function(a){a?b(a):c(function(a){b(a)})})}.bind(this)):e(function(a){b(a)})}.bind(this),g=function(a){a?b(a):(this.usb.listen(this.RXparse.bind(this)),f(b))}.bind(this);"undefined"==typeof a.maxTransferRetries&&(this.options.maxTransferRetries=5),this.usb.init(g)},J.prototype.exit=function(a){this.usb.exit(a)},J.prototype.RXparse=function(a,b){var c,e,k,f=0,g=1,i=2,j=4;if(a)return this.log.logging&&this.log.log("error",a),void 0;if(void 0===b)return this.log.logging&&this.log.log("error","Undefined data received in RX parser, may indicate problems with USB provider, i.e USBChrome"),void 0;if(e=b.length,this.partialMessage){var l=this.partialMessage.first[g];"undefined"==typeof l&&(l=b[0]),this.partialMessage.next=b.subarray(0,l-(this.partialMessage.first.length-j)),this.log.logging&&this.log.log("log",this.partialMessage),c=new Uint8Array(this.partialMessage.first.length+this.partialMessage.next.length),c.set(this.partialMessage.first,0),c.set(this.partialMessage.next,this.partialMessage.first.length),this.log.logging&&this.log.log("log","Reconstructed ",c)}else{if("undefined"==typeof b[g])return this.log.logging&&this.log.log("warn","No message length found in partial message ",b),c=b,this.partialMessage={first:c},void 0;if(c=b.subarray(0,b[g]+j),c.length<b[g]+j)return this.partialMessage={first:c},void 0}if(c[f]!==h.prototype.SYNC)return this.log.logging&&this.log.log("error","Invalid SYNC byte "+c[f]+" expected "+h.prototype.SYNC+" cannot trust the integrity of data, discarding "+b.length+"bytes, byte offset of buffer "+b.byteOffset,b,c),void 0;var o,s=c[c[g]+3];if("undefined"==typeof s)return this.log.logging&&this.log.log("Unable to get CRC of ANT message",c),void 0;var t=this._ANTMessage.getCRC(c);if(s!==t)return this.log.logging&&this.log.log("CRC not valid, skipping parsing of message, received CRC "+s+" calculated CRC "+t),void 0;switch(c[i]){case h.prototype.MESSAGE.BROADCAST_DATA:var u=new d(c);u.parse(c),this.log.logging&&this.log.log("log",u.toString()),"undefined"!=typeof this._channel[u.channel]?"function"!=typeof this._channel[u.channel].channel.broadCast?this.log.logging&&this.log.log("warn","No broadCast function available : on C# "+u.channel):(u.channelId.sensorId=u.channelId.getUniqueId(this._channel[u.channel].network,u.channel),this._channel[u.channel].channel.broadCast(u)):this.log.logging&&this.log.log("warn","No channel on host is associated with "+u.toString());break;case h.prototype.MESSAGE.NOTIFICATION_STARTUP:o=new m(c),this.log.logging&&this.log.log("log",o.toString()),this._responseCallback(o);break;case h.prototype.MESSAGE.NOTIFICATION_SERIAL_ERROR:o=new n(c),this.log.logging&&this.log.log("log","Notification serial error: ",o.toString());break;case h.prototype.MESSAGE.CHANNEL_RESPONSE:var w=new G(c);w.initiatingId&&(w.isRFEvent()||this._responseCallback(w)),"undefined"!=typeof this._channel[w.channel]?"function"!=typeof this._channel[w.channel].channel.channelResponse?this.log.logging&&this.log.log("warn","No channelResponse function available : on C# "+w.channel):this._channel[w.channel].channel.channelResponse(w):this.log.logging&&this.log.log("log","No channel on host is associated with "+w.toString());break;case h.prototype.MESSAGE.CHANNEL_STATUS:var x=new H(c);this._responseCallback(x);break;case h.prototype.MESSAGE.ANT_VERSION:var y=new q(c);this._responseCallback(y);break;case h.prototype.MESSAGE.CAPABILITIES:var z=new p(c);this.capabilities=z,this.log.logging&&this.log.log("log",z.toString()),this._responseCallback(z);break;case h.prototype.MESSAGE.DEVICE_SERIAL_NUMBER:var A=new r(c);this.deviceSerialNumber=A.serialNumber,this._responseCallback(A);break;default:this.log.logging&&this.log.log("log","Unable to parse received data",b," msg id ",c[i])}return this.partialMessage?(k=this.partialMessage.next.length,delete this.partialMessage):k=c.length,b.length>k?this.RXparse(void 0,b.subarray(k)):void 0},J.prototype.resetSystem=function(a){var b=new i;this._sendMessage(b,a)},J.prototype.getChannelId=function(a,b){var c=new o(a,h.prototype.MESSAGE.CHANNEL_ID);this._sendMessage(c,b)},J.prototype.getANTVersion=function(a){var b=new o(void 0,h.prototype.MESSAGE.ANT_VERSION);this._sendMessage(b,a)},J.prototype.getCapabilities=function(a){var b=new o(void 0,h.prototype.MESSAGE.CAPABILITIES);this._sendMessage(b,a)},J.prototype.getDeviceSerialNumber=function(a){var b=function(){if(!this.capabilities.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED)return a(new Error("Device does not have capability to determine serial number")),void 0;var b=new o(void 0,h.prototype.MESSAGE.DEVICE_SERIAL_NUMBER);this._sendMessage(b,a)}.bind(this);"undefined"==typeof this.capabilities?(this.log.logging&&this.log.log("warn","Cannot determine if device has capability for serial number - getCapabilities should be run first, attempting to get capabilities now"),this.getCapabilities(function(c){c?a(c):b()})):b()},J.prototype.getChannelStatus=function(a,b){K(this.capabilities,"channel",a);var c=new o(a,h.prototype.MESSAGE.CHANNEL_STATUS);this._sendMessage(c,b)},J.prototype.getChannelStatusAll=function(a){var c,b=0,d=function(){this.getChannelStatus(b,function(e,f){e?a(e):(this._channel[b].status=f,c=b+"       "+f.channelStatus.networkNumber+" "+f.channelStatus.stateMessage,this.log.logging&&this.log.log("log",c),b++,b<this.capabilities.MAX_CHAN?d():a())}.bind(this))}.bind(this),e=function(){this.log.logging&&this.log.log("log","Channel Network State"),d()}.bind(this);this.capabilities?e():(this.log.logging&&this.log.log("warn","Cannot determine max number of channels, capabilities object not available, call .getCapabilities first - trying to getCapabilities now"),this.getCapabilities(function(b){b?a(b):e()}))},J.prototype.libConfig=function(a,b){var c=new E(a);this._sendMessage(c,b)},J.prototype.unAssignChannel=function(a,b){var c;K(this.capabilities,"channel",a),c=new t,this._sendMessage(c,b)},J.prototype.assignChannel=function(a,b,c,d,e){var f,g;K(this.capabilities,"channel",a),g=new s(a,b,c,d),"function"==typeof d?f=d:(f=e,"undefined"==typeof this.capabilities&&f(new Error("getCapabilities should be run to determine capability for extended assign")),this.capabilities.advancedOptions2.CAPABILITIES_EXT_ASSIGN_ENABLED||f(new Error("Device does not support extended assignment"))),this._sendMessage(g,f)},J.prototype.setChannelId=function(a,b,c,d,e){var f;K(this.capabilities,"channel",a),f=new u(a,b,c,d),this._sendMessage(f,e)},J.prototype.setSerialNumChannelId=function(a,b,c,d){"undefined"==typeof this.capabilities&&d(new Error("getCapabilities should be run to determine capability for device serial number")),this.capabilities.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED||d(new Error("Device does not support serial number - cannot use lower 2 bytes of serial number as device number in the channel ID"));var e;K(this.capabilities,"channel",a),e=new D(a,b,c),this._sendMessage(e,d)},J.prototype.setChannelPeriod=function(a,b,c){var d;K(this.capabilities,"channel",a),this.log.logging&&this.log.log("log","Channel period (Tch) is ",b),d=new v(a,b),this._sendMessage(d,c)},J.prototype.setLowPriorityChannelSearchTimeout=function(a,b,c){"undefined"==typeof this.capabilities&&c(new Error("getCapabilities should be run first to determine if device support low priority channel search")),this.capabilities.advancedOptions.CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED||c(new Error("Device does not support setting low priority search"));var d;K(this.capabilities,"channel",a),d=new x(a,b),this._sendMessage(d,c)},J.prototype.setChannelSearchTimeout=function(a,b,c){var d;K(this.capabilities,"channel",a),d=new w(a,b),this._sendMessage(d,c)},J.prototype.setChannelRFFreq=function(a,b,c){var d;K(this.capabilities,"channel",a),d=new y(a,b),this._sendMessage(d,c)},J.prototype.setNetworkKey=function(a,b,c){var d;K(this.capabilities,"network",a),d=new z(a,b),this._sendMessage(d,c)},J.prototype.openRxScanMode=function(a,b){var c;K(this.capabilities,"channel",a),c=new k(a),this._sendMessage(c,b)},J.prototype.openChannel=function(a,b){var c;K(this.capabilities,"channel",a),c=new j(a),this._sendMessage(c,b)},J.prototype.closeChannel=function(a,b){var c;K(this.capabilities,"channel",a),c=new l(a),this._sendMessage(c,b)},c.exports=J,c.exports});