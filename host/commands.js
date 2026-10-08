'use strict';

var Message = require('../messages/message'),
  ResetSystemMessage = require('../messages/control/reset-system-message'),
  SleepMessage = require('../messages/control/sleep-message'),
  RequestMessage = require('../messages/control/request-message'),
  ConfigureAdvancedBurstMessage = require('../messages/configuration/configure-advanced-burst-message'),
  ConfigureEventBufferMessage = require('../messages/configuration/configure-event-buffer-message'),
  LibConfigMessage = require('../messages/configuration/lib-config-message'),
  UnAssignChannelMessage = require('../messages/configuration/un-assign-channel-message'),
  AssignChannelMessage = require('../messages/configuration/assign-channel-message'),
  SetChannelIDMessage = require('../messages/configuration/set-channel-id-message'),
  SetSerialNumChannelIdMessage = require('../messages/configuration/set-serial-num-channel-id-message'),
  SetChannelPeriodMessage = require('../messages/configuration/set-channel-period-message'),
  SetLowPriorityChannelSearchTimeoutMessage = require('../messages/configuration/set-low-priority-channel-search-timeout-message'),
  SetChannelSearchTimeoutMessage = require('../messages/configuration/set-channel-search-timeout-message'),
  SetChannelRFFreqMessage = require('../messages/configuration/set-channel-rf-freq-message'),
  SetNetworkKeyMessage = require('../messages/configuration/set-network-key-message'),
  SetSearchWaveformMessage = require('../messages/configuration/set-search-waveform-message'),
  SetTransmitPowerMessage = require('../messages/configuration/set-transmit-power-message'),
  SetChannelTxPowerMessage = require('../messages/configuration/set-channel-tx-power-message'),
  SetProximitySearchMessage = require('../messages/configuration/set-proximity-search-message'),
  OpenRxScanModeMessage = require('../messages/control/open-rx-scan-mode-message'),
  OpenChannelMessage = require('../messages/control/open-channel-message'),
  CloseChannelMessage = require('../messages/control/close-channel-message');

module.exports = function(Host) {
  Host.prototype.resetSystem = function(callback) {

    var onNotificationStartup = function _onNotificationStartup(err, notificationStartup) {
      var DELAY = 500;
      if (this.log.logging)
        this.log.debug( 'Waiting ' + DELAY + ' ms after reset system (for post-reset device state)');
      setTimeout(callback.bind(this, err, notificationStartup), DELAY);
    }.bind(this);

    this.sendMessage(new ResetSystemMessage(), Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_STARTUP], undefined, onNotificationStartup);
  };

  Host.prototype.sleep = function(callback) {
    this.sendMessage(new SleepMessage(), undefined, undefined, callback);
  };

  Host.prototype.getChannelId = function(channel, callback) {

    this.sendMessage(new RequestMessage(channel, Message.prototype.SET_CHANNEL_ID), Message.prototype.MESSAGE[Message.prototype.SET_CHANNEL_ID], undefined, callback);
  };

  Host.prototype.getVersion = function(callback) {

    this.sendMessage(new RequestMessage(undefined, Message.prototype.ANT_VERSION), Message.prototype.MESSAGE[Message.prototype.ANT_VERSION], undefined, callback);
  };

  Host.prototype.getCapabilities = function(callback) {

    this.sendMessage(new RequestMessage(undefined, Message.prototype.CAPABILITIES), Message.prototype.MESSAGE[Message.prototype.CAPABILITIES], undefined, callback);
  };

  Host.prototype.getAdvancedBurstCapabilities = function(callback) {

    this.sendMessage(new RequestMessage(0x00, Message.prototype.ADVANCED_BURST_CAPABILITIES), Message.prototype.MESSAGE[Message.prototype.ADVANCED_BURST_CAPABILITIES], undefined, callback);
  };

  Host.prototype.getAdvancedBurstConfiguration = function(callback) {

    this.sendMessage(new RequestMessage(0x01, Message.prototype.ADVANCED_BURST_CAPABILITIES), Message.prototype.MESSAGE[Message.prototype.ADVANCED_BURST_CAPABILITIES], undefined, callback);
  };

  // For convenience
  Host.prototype.enableAdvancedBurst = function(maxPacketLength, callback) {

    var cb = callback,
      packetLength;


    if (typeof maxPacketLength === 'function') {
      cb = maxPacketLength;
      packetLength = this.ADVANCED_BURST.MAX_PACKET_24BYTES;
    } else {
      packetLength = maxPacketLength;
    }

    this.configAdvancedBurst(this.ADVANCED_BURST.ENABLE, packetLength, 0, 0, cb);
  };

  Host.prototype.disableAdvancedBurst = function(callback) {
    this.configAdvancedBurst(this.ADVANCED_BURST.DISABLE, this.ADVANCED_BURST.MAX_PACKET_24BYTES, 0, 0, callback);
  };

  Host.prototype.configAdvancedBurst = function(enable, maxPacketLength, requiredFeatures, optionalFeatures, stallCount, retryCount, callback) {
    var cb = callback;

    if (typeof stallCount === 'function')
      cb = stallCount;

    this.sendMessage(new ConfigureAdvancedBurstMessage(enable, maxPacketLength, requiredFeatures, optionalFeatures, stallCount, retryCount), undefined, undefined, cb);
  };

  Host.prototype.getSerialNumber = function(callback) {

    this.sendMessage(new RequestMessage(undefined, Message.prototype.DEVICE_SERIAL_NUMBER), Message.prototype.MESSAGE[Message.prototype.DEVICE_SERIAL_NUMBER], undefined, callback);
  };

  Host.prototype.configEventBuffer = function(config, size, time, callback) {
    this.sendMessage(new ConfigureEventBufferMessage(config, size, time), undefined, undefined, callback);
  };

  Host.prototype.getEventBufferConfiguration = function(callback) {

    this.sendMessage(new RequestMessage(undefined, Message.prototype.EVENT_BUFFER_CONFIGURATION), Message.prototype.MESSAGE[Message.prototype.EVENT_BUFFER_CONFIGURATION], undefined, callback);
  };

  Host.prototype.getChannelStatus = function(channel, callback) {

    this.sendMessage(new RequestMessage(channel, Message.prototype.CHANNEL_STATUS), Message.prototype.MESSAGE[Message.prototype.CHANNEL_STATUS], channel, callback);
  };

  // Spec p. 75 "If supported, when this setting is enabled ANT will include the channel ID, RSSI, or timestamp data with the messages"
  // 0 - Disabled, 0x20 = Enable RX timestamp output, 0x40 - Enable RSSI output, 0x80 - Enabled Channel ID output
  Host.prototype.libConfig = function(libConfig, callback) {

    this.sendMessage(new LibConfigMessage(libConfig), this.EVENT.OK, 0, callback);
  };

  // Unassign a channel. A channel must be unassigned before it may be reassigned. (spec p. 63)
  Host.prototype.unAssignChannel = function(channel, callback) {

    this.sendMessage(new UnAssignChannelMessage(channel), this.EVENT.OK, channel, callback);
  };

  /* Reserves channel number and assigns channel type and network number to the channel, sets all other configuration parameters
     to defaults. Assign channel command should be issued before any other channel configuration messages
     (p. 64 ANT Message Protocol And Usaga Rev 50) -> also sets defaults values for RF, period, tx power, search timeout p.22 */
  Host.prototype.assignChannel = function(channel, channelType, networkNumber, extendedAssignment, callback) {
    var cb,
      configurationMsg;

    if (typeof extendedAssignment === "function") {
      cb = extendedAssignment; // If no extended assignment use argument as callback
      configurationMsg = new AssignChannelMessage(channel, channelType, networkNumber);
    } else {
      cb = callback;
      configurationMsg = new AssignChannelMessage(channel, channelType, networkNumber, extendedAssignment);
    }

    this.sendMessage(configurationMsg, this.EVENT.OK, channel, cb);

  };

  /* Master: id transmitted along with messages Slave: sets channel ID to match the master it wishes to find,
   0 = wildcard "When the device number is fully known the pairing bit is ignored" (spec. p. 65)
  */
  Host.prototype.setChannelId = function(channel, deviceNum, deviceType, transmissionType, callback) {

    this.sendMessage(new SetChannelIDMessage(channel, deviceNum, deviceType, transmissionType), this.EVENT.OK, channel, callback);
  };

  // Uses the lower 2 bytes of the device serial number as channel Id.
  Host.prototype.setSerialNumChannelId = function(channel, deviceType, transmissionType, callback) {

    this.sendMessage(new SetSerialNumChannelIdMessage(channel, deviceType, transmissionType), this.EVENT.OK, channel, callback);
  };

  Host.prototype.setChannelPeriod = function(channel, messagePeriod, callback) {

    this.sendMessage(new SetChannelPeriodMessage(channel, messagePeriod), this.EVENT.OK, channel, callback);
  };

  // Low priority search mode
  // Spec. p. 72 : "...a low priority search will not interrupt other open channels on the device while searching",
  // "If the low priority search times out, the module will switch to high priority mode"
  Host.prototype.setLowPriorityChannelSearchTimeout = function(channel, searchTimeout, callback) {
    // Timeout in sec. : ucSearchTimeout * 2.5 s, 255 = infinite, 0 = disable low priority search

    this.sendMessage(new SetLowPriorityChannelSearchTimeoutMessage(channel, searchTimeout), this.EVENT.OK, channel, callback);
  };

  // Set High priority search timeout, each count in searchTimeout = 2.5 s, 255 = infinite,
  //0 = disable high priority search mode (default search timeout is 25 seconds)
  Host.prototype.setChannelSearchTimeout = function(channel, searchTimeout, callback) {

    this.sendMessage(new SetChannelSearchTimeoutMessage(channel, searchTimeout), this.EVENT.OK, channel, callback);
  };

  // Set the RF frequency, i.e 66 = 2466 MHz
  Host.prototype.setChannelRFFreq = function(channel, RFFreq, callback) {

    this.sendMessage(new SetChannelRFFreqMessage(channel, RFFreq), this.EVENT.OK, channel, callback);
  };

  // Set network key for specific net
  Host.prototype.setNetworkKey = function(netNumber, key, callback) {

    this.sendMessage(new SetNetworkKeyMessage(netNumber, key), this.EVENT.OK, 0, callback);
  };

  // Set search waveform individual channel
  Host.prototype.setSearchWaveform = function(channel, searchWaveform, callback) {

    this.sendMessage(new SetSearchWaveformMessage(channel, searchWaveform), this.EVENT.OK, channel, callback);
  };

  // Set transmit power for all channels
  Host.prototype.setTransmitPower = function(transmitPower, callback) {

    this.sendMessage(new SetTransmitPowerMessage(transmitPower), this.EVENT.OK, 0, callback);
  };

  // Set transmit power for individual channel
  Host.prototype.setChannelTxPower = function(channel, transmitPower, callback) {

    this.sendMessage(new SetChannelTxPowerMessage(channel, transmitPower), this.EVENT.OK, channel, callback);
  };

  // "Enabled a one-time proximity requirement for searching. Once a proximity searh has been successful, this threshold value will be cleared" (spec. p. 76)
  Host.prototype.setProximitySearch = function(channel, searchThreshold, callback) {

    this.sendMessage(new SetProximitySearchMessage(channel, searchThreshold), this.EVENT.OK, channel, callback);
  };

  Host.prototype.openRxScanMode = function(channel, callback) {

    this.sendMessage(new OpenRxScanModeMessage(channel), this.EVENT.OK, channel, callback);
  };

  // Opens a previously assigned and configured channel. Data messages or events begins to be issued. (spec p. 88)
  Host.prototype.openChannel = function(channel, callback) {

    this.sendMessage(new OpenChannelMessage(channel), this.EVENT.OK, channel, callback);
  };

  // Close a channel that has been previously opened. Channel still remains assigned and can be reopened at any time. (spec. p 88)
  Host.prototype.closeChannel = function(channel, callback) {

    // Wait for EVENT_CHANNEL_CLOSED ?
    // If channel status is tracking -> can get broadcast data packet before event channel closed packet

    this.sendMessage(new CloseChannelMessage(channel), this.EVENT.OK, channel, callback);

  };

};
